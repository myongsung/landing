# Evidence Argument Graph v2

## 문제 정의

v1 그래프는 같은 입력에 등장한 인물, 사건, 증거를 관계 그래프로 배치하는 데 집중했다. 이 방식은 시각적으로는 빠르지만, 실제 형사사건 검토에서 중요한 “어떤 원자료가 어떤 명제를 지지하고, 그 명제가 어떤 검토항목 또는 가설로 이어지는가”를 추적하기 어렵다.

v2는 그래프를 다음 흐름으로 재구성한다.

원자료 또는 원문 구간 → 원자적 사실·주장 명제 → 추론 → 검토항목 → 경쟁 가설

이 구조는 유무죄, 책임, 법적 충분성을 자동 판단하지 않는다. 목적은 출처 추적, 공백 탐지, 근거 경로 확인, 증거 제거 시뮬레이션, 경쟁 가설 비교를 보조하는 것이다.

## v2 스키마

`GRAPH_SCHEMA_VERSION`은 `2`다. 스냅샷은 다음 핵심 필드를 가진다.

- `nodes`: GraphNodeV2 배열
- `links`: GraphEdgeV2 배열. 기존 호환성을 위해 이름은 유지하지만 방향성과 다중 관계를 갖는 v2 edge다.
- `relationCandidates`: 아직 승인되지 않은 후보 관계
- `clusters`: 사용자가 묶은 시각 클러스터
- `activeLegalTemplateId`: 선택된 검토항목 세트. 현재 UI에서는 직접 선택 기능을 노출하지 않는다.
- `analysisResults`: 로컬 분석 결과 캐시
- 기존 선택 상태, viewport, next number 상태

## 노드 의미

- `person`: 행위자, 피해 주장자, 진술자, 참고인, 담당자, 기관 관계자
- `event`: 행위, 통화, 송금, 면담, 제출, 조사, 접촉 등 발생 장면
- `evidence`: PDF, 녹취, 메시지 원본, CCTV, 계좌내역, 진술서 등 자료 단위
- `source_span`: 특정 파일 또는 사용자 입력의 정확한 원문 구간
- `claim`: 검증 가능한 원자적 명제
- `inference`: 한 명제나 증거에서 다른 명제, 검토항목, 가설로 넘어가는 추론 단계
- `legal_element`: 논증 구조 안에서 사용자가 직접 둔 검토항목
- `hypothesis`: 서로 경쟁할 수 있는 사건 설명

알 수 없는 종류는 `unknown`으로 처리한다. 알 수 없는 노드를 조용히 `person`으로 바꾸지 않는다.

## 관계 의미

지원하는 주요 관계 유형은 다음과 같다.

- `CONTAINS`: 증거가 원문 구간을 포함
- `ASSERTS`: 원문 구간 또는 사람이 명제를 진술
- `DERIVED_FROM`: 명제가 원문 또는 자료에서 파생
- `PARTICIPATES_AS`: 인물이 사건에 특정 역할로 참여
- `SUPPORTS`: 명제나 자료가 다른 명제, 추론, 검토항목, 가설을 지지
- `ATTACKS`: 명제나 자료가 가설 또는 명제를 공격
- `UNDERCUTS`: 추론의 연결 자체를 약화
- `SATISFIES`: 명제 또는 추론이 검토항목 검토에 관련된 근거를 제공
- `REQUIRED_FOR`: 검토항목이 가설 검토에 필요
- `PRECEDES`, `OVERLAPS`: 시간관계
- `CONTRADICTS`: 양립하기 어려운 명제
- `ALTERNATIVE_TO`, `INCOMPATIBLE_WITH`: 경쟁 가설 관계
- `LEGACY_RELATED_TO`: v1에서 이관된 방향 미확정 관계

중복 판정은 `source + target + type + role` 기준이다. `A → B`와 `B → A`는 다른 관계이며, 같은 두 노드 사이에도 `SUPPORTS`, `ATTACKS`, `RELEVANT_TO` 성격의 관계가 병존할 수 있다.

## Accepted Link와 Candidate

`links`는 사용자가 승인했거나 직접 근거가 있는 accepted edge다. 분석 엔진은 기본적으로 accepted edge만 계산한다.

`relationCandidates`는 아직 분석 경로에 포함되지 않는 후보 관계다. 다음 경우 후보로만 저장한다.

- 같은 문장 또는 같은 문서에 함께 등장
- 같은 장면으로 보이지만 직접 근거가 없음
- AI가 관계를 제안했으나 정확한 `sourceRef.quote`가 없음
- v1 무방향 링크를 마이그레이션한 관계

후보는 승인하면 GraphEdgeV2로 변환되고, 거절하면 `rejected` 상태로 저장되어 반복 생성되지 않게 한다.

## v1 마이그레이션

`migrateGraphSnapshotV1ToV2`는 v1 스냅샷을 손실 없이 v2로 변환한다.

- 기존 `person`, `event`, `evidence` 노드는 그대로 보존
- 기존 `layer`는 `importance`로 이동
- note, 날짜, 파일 정보, 좌표 보존
- 새 필드는 안전한 기본값 적용
- `createdBy`는 `migration`
- 기존 무방향 링크는 accepted link로 해석하지 않고 `relationCandidates`로 이동
- `suggestedType`은 `LEGACY_RELATED_TO`
- `reason`은 `legacy_undirected_relation`

마이그레이션은 idempotent하다. 이미 v2인 스냅샷은 다시 마이그레이션하지 않는다.

## 결정론적 분석 알고리즘

순수 함수는 `graph-v2.js`에 있다.

- `validateGraphSemantics(graph)`: 관계 유형별 source/target kind 검증
- `buildGraphAdjacency(graph)`: accepted edge 기반 방향 그래프 구성
- `traceProvenancePaths(graph, targetNodeId)`: target에서 source_span/evidence까지 역방향 근거 경로 추적
- `traceSupportPaths(graph, targetNodeId)`: SUPPORTS, SATISFIES, REQUIRED_FOR 등 지지 경로 추적
- `findUnsupportedLegalElements(graph, templateId)`: required 검토항목의 근거 공백 탐지
- `findSingleEvidenceDependencies(graph, templateId)`: 단일 evidence root에만 의존하는 영역 탐지
- `simulateEvidenceRemoval(graph, evidenceNodeId, templateId)`: 증거 제거 시 영향받는 claim, legal_element, hypothesis 계산
- `findExplicitContradictions(graph)`: polarity 충돌, PRECEDES 순환 등 명시 모순 탐지
- `compareHypotheses(graph)`: 각 가설별 지지, 공격, 약화, 미설명 자료 구조화
- `suggestEvidenceGaps(graph, templateId)`: 다음 확보 자료 제안
- `buildGraphQueryPackage(graph, command, options)`: LLM에 보낼 부분 그래프와 로컬 분석 결과 구성

규칙상 `relationCandidates`, `rejected`, `unverified` 관계는 기본 지지 경로에서 제외한다. 단순 연결 개수나 밀도를 사건 강도로 쓰지 않는다.

## 검토항목 세트 추가 방법

검토항목 세트는 결론 엔진이 아니라 체크리스트다. `graph-v2.js`의 `legalIssueTemplates`에 항목 세트를 추가할 수 있다.

필수 필드:

- `id`
- `label`
- `description`
- `elements`

각 element에는 다음을 둔다.

- `key`
- `label`
- `required`
- `description`
- `expectedEvidenceTypes`

템플릿 선택 시 `legal_element` 노드는 결정론적으로 생성된다. 자료가 있다는 이유만으로 `SATISFIES` 관계를 자동 확정하지 않는다.

## 개인정보와 법적 판단 한계

v2 그래프는 민감한 원문 발췌와 인물 정보를 포함할 수 있다. LLM 호출에는 전체 자료를 무조건 보내지 않고, `buildGraphQueryPackage`가 명령과 관련된 부분 그래프, 1~3 hop 이웃, 필요한 source span, 분석 엔진 결과만 선택한다.

시스템은 다음을 하지 않는다.

- 유무죄, 형사책임, 위법성, 고의·과실, 법적 충분성 자동 판단
- 증명 정도나 책임 가능성 점수화
- 입력에 없는 시간, 페이지, 역할, 의도 생성
- 동시출현만으로 accepted 관계 생성

출력은 구조적 검토 보조, 공백 탐지, 근거 추적, 확인 질문으로 제한한다.

## 테스트 실행법

순수 그래프 모듈 테스트는 Node 내장 test runner를 사용한다.

```bash
node --test tests/graph-v2.test.mjs
```

프론트 문법 확인은 다음으로 실행할 수 있다.

```bash
node --check app.js
```

Edge Function은 Supabase/Deno 런타임에서 실행된다. 로컬에 Deno가 있으면 다음처럼 별도 확인할 수 있다.

```bash
deno check report-chat.ts
```
