-- RoosyCozy report usage RPC fix
-- This version does not directly reference optional columns such as rpl.limit_points.
-- It reads rows through to_jsonb(...) and picks the first matching column that exists.

create or replace function public.roosycozy_jsonb_int(source jsonb, key text)
returns integer
language sql
immutable
as $$
  select case
    when source is not null
      and source ? key
      and (source ->> key) ~ '^-?[0-9]+$'
      then (source ->> key)::integer
    else null
  end;
$$;

create or replace function public.roosycozy_default_report_limit(input_tier public.membership_tier)
returns integer
language sql
immutable
as $$
  select case
    when input_tier = 'pro'::public.membership_tier then 500
    when input_tier = 'teacher'::public.membership_tier then 150
    else 20
  end;
$$;

drop function if exists public.consume_report_usage_for_user(uuid, text, integer);
drop function if exists public.consume_report_usage_for_user(text, integer, uuid);

create or replace function public.consume_report_usage_for_user(
  target_user_id uuid,
  input_kind text default 'message',
  input_units integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier public.membership_tier := 'general'::public.membership_tier;
  v_membership_row jsonb := '{}'::jsonb;
  v_plan_row jsonb := '{}'::jsonb;
  v_limit integer := 20;
  v_units integer := greatest(coalesce(input_units, 1), 1);
  v_period_col text;
  v_period_udt text;
  v_period_value text;
  v_period_expr text;
  v_message_col text;
  v_report_col text;
  v_has_updated_at boolean := false;
  v_message_units integer := 0;
  v_report_units integer := 0;
  v_existing_row jsonb;
  v_usage_row jsonb;
  v_used_messages integer := 0;
  v_used_reports integer := 0;
  v_used_total integer := 0;
  v_sql text;
begin
  if target_user_id is null then
    raise exception 'target_user_id is required.';
  end if;

  if auth.uid() is not null and auth.uid() <> target_user_id then
    raise exception 'Cannot consume usage for another user.';
  end if;

  select to_jsonb(um)
    into v_membership_row
  from public.user_memberships um
  where um.user_id = target_user_id
  limit 1;

  v_tier := coalesce(
    nullif(v_membership_row ->> 'tier', '')::public.membership_tier,
    'general'::public.membership_tier
  );

  select to_jsonb(rpl)
    into v_plan_row
  from public.report_plan_limits rpl
  where to_jsonb(rpl) ->> 'tier' = v_tier::text
  limit 1;

  v_limit := coalesce(
    public.roosycozy_jsonb_int(v_plan_row, 'limit_points'),
    public.roosycozy_jsonb_int(v_plan_row, 'limit_messages'),
    public.roosycozy_jsonb_int(v_plan_row, 'limit_reports'),
    public.roosycozy_jsonb_int(v_plan_row, 'monthly_limit'),
    public.roosycozy_jsonb_int(v_plan_row, 'monthly_messages'),
    public.roosycozy_jsonb_int(v_plan_row, 'message_limit'),
    public.roosycozy_default_report_limit(v_tier)
  );

  select c.column_name, c.udt_name
    into v_period_col, v_period_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'report_usage_monthly'
    and c.column_name in ('period', 'period_month', 'month', 'usage_month')
  order by array_position(array['period', 'period_month', 'month', 'usage_month'], c.column_name)
  limit 1;

  if v_period_col is null then
    raise exception 'report_usage_monthly needs a period, period_month, month, or usage_month column.';
  end if;

  if v_period_udt = 'date' then
    v_period_value := to_char(date_trunc('month', now()), 'YYYY-MM-01');
    v_period_expr := '$2::date';
  elsif v_period_udt in ('timestamp', 'timestamptz') then
    v_period_value := to_char(date_trunc('month', now()), 'YYYY-MM-DD"T"HH24:MI:SSOF');
    v_period_expr := '$2::timestamptz';
  else
    v_period_value := to_char(now(), 'YYYY-MM');
    v_period_expr := '$2::text';
  end if;

  select c.column_name
    into v_message_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'report_usage_monthly'
    and c.column_name in ('used_messages', 'used_points', 'used', 'message_count', 'messages_used')
  order by array_position(array['used_messages', 'used_points', 'used', 'message_count', 'messages_used'], c.column_name)
  limit 1;

  if v_message_col is null then
    raise exception 'report_usage_monthly needs a used_messages, used_points, used, message_count, or messages_used column.';
  end if;

  select c.column_name
    into v_report_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'report_usage_monthly'
    and c.column_name in ('used_reports', 'report_count', 'reports_used')
  order by array_position(array['used_reports', 'report_count', 'reports_used'], c.column_name)
  limit 1;

  select exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'report_usage_monthly'
      and c.column_name = 'updated_at'
  )
    into v_has_updated_at;

  if input_kind = 'report' and v_report_col is not null then
    v_report_units := v_units;
  else
    v_message_units := v_units;
  end if;

  execute format(
    'select to_jsonb(t) from public.report_usage_monthly t where t.user_id = $1 and t.%I = ' || v_period_expr || ' limit 1',
    v_period_col
  )
    into v_existing_row
    using target_user_id, v_period_value;

  if v_existing_row is null then
    if v_report_col is not null and v_report_col <> v_message_col then
      v_sql := format(
        'insert into public.report_usage_monthly (user_id, %I, %I, %I%s) values ($1, ' || v_period_expr || ', $3, $4%s)',
        v_period_col,
        v_message_col,
        v_report_col,
        case when v_has_updated_at then ', updated_at' else '' end,
        case when v_has_updated_at then ', now()' else '' end
      );

      execute v_sql using target_user_id, v_period_value, v_message_units, v_report_units;
    else
      v_sql := format(
        'insert into public.report_usage_monthly (user_id, %I, %I%s) values ($1, ' || v_period_expr || ', $3%s)',
        v_period_col,
        v_message_col,
        case when v_has_updated_at then ', updated_at' else '' end,
        case when v_has_updated_at then ', now()' else '' end
      );

      execute v_sql using target_user_id, v_period_value, v_message_units + v_report_units;
    end if;
  else
    if v_report_col is not null and v_report_col <> v_message_col then
      v_sql := format(
        'update public.report_usage_monthly set %I = coalesce(%I, 0) + $3, %I = coalesce(%I, 0) + $4%s where user_id = $1 and %I = ' || v_period_expr,
        v_message_col,
        v_message_col,
        v_report_col,
        v_report_col,
        case when v_has_updated_at then ', updated_at = now()' else '' end,
        v_period_col
      );

      execute v_sql using target_user_id, v_period_value, v_message_units, v_report_units;
    else
      v_sql := format(
        'update public.report_usage_monthly set %I = coalesce(%I, 0) + $3%s where user_id = $1 and %I = ' || v_period_expr,
        v_message_col,
        v_message_col,
        case when v_has_updated_at then ', updated_at = now()' else '' end,
        v_period_col
      );

      execute v_sql using target_user_id, v_period_value, v_message_units + v_report_units;
    end if;
  end if;

  execute format(
    'select to_jsonb(t) from public.report_usage_monthly t where t.user_id = $1 and t.%I = ' || v_period_expr || ' limit 1',
    v_period_col
  )
    into v_usage_row
    using target_user_id, v_period_value;

  v_used_messages := coalesce(public.roosycozy_jsonb_int(v_usage_row, v_message_col), 0);
  v_used_reports := case
    when v_report_col is not null and v_report_col <> v_message_col
      then coalesce(public.roosycozy_jsonb_int(v_usage_row, v_report_col), 0)
    else 0
  end;
  v_used_total := v_used_messages + v_used_reports;

  if v_used_total > v_limit then
    raise exception 'Monthly usage limit exceeded.';
  end if;

  return jsonb_build_object(
    'tier', v_tier,
    'period', v_period_value,
    'used_messages', v_used_messages,
    'used_reports', v_used_reports,
    'used', v_used_total,
    'used_points', v_used_total,
    'limit', v_limit,
    'limit_points', v_limit,
    'remaining', greatest(0, v_limit - v_used_total)
  );
end;
$$;

grant execute on function public.consume_report_usage_for_user(uuid, text, integer) to authenticated;
grant execute on function public.consume_report_usage_for_user(uuid, text, integer) to service_role;

drop function if exists public.get_my_report_usage();

create or replace function public.get_my_report_usage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tier public.membership_tier := 'general'::public.membership_tier;
  v_membership_row jsonb := '{}'::jsonb;
  v_plan_row jsonb := '{}'::jsonb;
  v_limit integer := 20;
  v_period_col text;
  v_period_udt text;
  v_period_value text;
  v_period_expr text;
  v_message_col text;
  v_report_col text;
  v_usage_row jsonb := '{}'::jsonb;
  v_used_messages integer := 0;
  v_used_reports integer := 0;
  v_used_total integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select to_jsonb(um)
    into v_membership_row
  from public.user_memberships um
  where um.user_id = v_user_id
  limit 1;

  v_tier := coalesce(
    nullif(v_membership_row ->> 'tier', '')::public.membership_tier,
    'general'::public.membership_tier
  );

  select to_jsonb(rpl)
    into v_plan_row
  from public.report_plan_limits rpl
  where to_jsonb(rpl) ->> 'tier' = v_tier::text
  limit 1;

  v_limit := coalesce(
    public.roosycozy_jsonb_int(v_plan_row, 'limit_points'),
    public.roosycozy_jsonb_int(v_plan_row, 'limit_messages'),
    public.roosycozy_jsonb_int(v_plan_row, 'limit_reports'),
    public.roosycozy_jsonb_int(v_plan_row, 'monthly_limit'),
    public.roosycozy_jsonb_int(v_plan_row, 'monthly_messages'),
    public.roosycozy_jsonb_int(v_plan_row, 'message_limit'),
    public.roosycozy_default_report_limit(v_tier)
  );

  select c.column_name, c.udt_name
    into v_period_col, v_period_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'report_usage_monthly'
    and c.column_name in ('period', 'period_month', 'month', 'usage_month')
  order by array_position(array['period', 'period_month', 'month', 'usage_month'], c.column_name)
  limit 1;

  select c.column_name
    into v_message_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'report_usage_monthly'
    and c.column_name in ('used_messages', 'used_points', 'used', 'message_count', 'messages_used')
  order by array_position(array['used_messages', 'used_points', 'used', 'message_count', 'messages_used'], c.column_name)
  limit 1;

  select c.column_name
    into v_report_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'report_usage_monthly'
    and c.column_name in ('used_reports', 'report_count', 'reports_used')
  order by array_position(array['used_reports', 'report_count', 'reports_used'], c.column_name)
  limit 1;

  if v_period_col is not null and v_message_col is not null then
    if v_period_udt = 'date' then
      v_period_value := to_char(date_trunc('month', now()), 'YYYY-MM-01');
      v_period_expr := '$2::date';
    elsif v_period_udt in ('timestamp', 'timestamptz') then
      v_period_value := to_char(date_trunc('month', now()), 'YYYY-MM-DD"T"HH24:MI:SSOF');
      v_period_expr := '$2::timestamptz';
    else
      v_period_value := to_char(now(), 'YYYY-MM');
      v_period_expr := '$2::text';
    end if;

    execute format(
      'select to_jsonb(t) from public.report_usage_monthly t where t.user_id = $1 and t.%I = ' || v_period_expr || ' limit 1',
      v_period_col
    )
      into v_usage_row
      using v_user_id, v_period_value;

    v_used_messages := coalesce(public.roosycozy_jsonb_int(v_usage_row, v_message_col), 0);
    v_used_reports := case
      when v_report_col is not null and v_report_col <> v_message_col
        then coalesce(public.roosycozy_jsonb_int(v_usage_row, v_report_col), 0)
      else 0
    end;
  else
    v_period_value := to_char(now(), 'YYYY-MM');
  end if;

  v_used_total := v_used_messages + v_used_reports;

  return jsonb_build_object(
    'tier', v_tier,
    'period', v_period_value,
    'used_messages', v_used_messages,
    'used_reports', v_used_reports,
    'used', v_used_total,
    'used_points', v_used_total,
    'limit', v_limit,
    'limit_points', v_limit,
    'remaining', greatest(0, v_limit - v_used_total)
  );
end;
$$;

grant execute on function public.get_my_report_usage() to authenticated;
