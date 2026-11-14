# 入軌火箭與登月的引擎接入

## 註冊與介面

將章節的 `MissionRules` 註冊到 [rules.ts](../src/missions/rules.ts)，再將同一份規則與 `MissionUi` 組合成 [index.ts](../src/missions/index.ts) 的 `MissionModule`。大廳依既有章節順序與最低目標解鎖。共用 `Single` 會呈現設計選項、工作、事件、審查與飛行階段。用 `ui.Status({ game, t })` 顯示經費預估、合約與支援時段等工作台資訊，用 `ui.Estimate` 與 `ui.outcome` 讀取狀態並產生章節文案。選項的插值欄位放在 `DesignOption.params`，`cost` 以原始經費數字代入。

`initialize(game)` 可讀取前局帶入的 `game.records`，在 `game.missionState` 建立本局資料。規則回呼須同步、純函式，並以新物件更新狀態。存檔沿用 `space-mission.single.v2`。自訂狀態使用 JSON 資料，工作、事件及飛行階段的 ID 在後續版本需維持穩定。

## 工作與事件

- 在 `costs` 放入每個工作的標籤與表列成本，再用同 ID 的 `tasks[id].plan(game)` 決定是否出現在工作台及實際週數與費用。提供 `tasks` 時，章節用這個選單安排所有工作，包括等待、重測和返工。
- `start(game)` 在一次扣款後執行，可消耗支援時段。`complete(game)` 在所有工作週完成後執行，由章節更新階段、付款及證據。零週工作可用於簽約等即時操作。整合或重測產生的 `evidence` 帶上目前的 `design`、`revision` 和 `week`。定版後變更設計時遞增 `revision`。
- 每週結束檢查事件，包含工作的最後一週。事件觸發時保留已付款工作與剩餘週數，玩家選擇後自動續跑。同一週有多個事件時依規則順序處理。事件可更新 `deadline`、`credits` 或章節狀態，文案插值由 `values(game)` 提供。
- `effectiveDeadline(game)` 供工作排程與審查共用。登月可從 `game.deadline` 扣除路線所需週數。若事件使剩餘工作無法趕上期限，該局以期限不足結案，已付款列入紀錄，工作成果不入帳。恰好在有效期限完成仍可送審。若章節需要在動作結束後判斷是否還有補救路徑，可透過 `stopReason(game)` 回傳結案原因。

## 審查與豁免

`reviews.PDR(game, evidence)` 在 `stage: 'design'`、`gate: 'PDR'` 時啟用。`reviews.FRR` 在 `stage: 'review'` 時啟用。回傳 `null` 表示尚不能送審，空的 `issues` 代表條件全數滿足。引擎傳入與目前設計和版本一致的證據，缺少有效證據時傳入 `null`，規則據此列出問題。

每個問題可附一個可用的 `waiver`。全部問題都關閉或由玩家勾選對應豁免才會通過。規則可以用 `approve` 和 `return` 提供帶變數的結論，例如入軌案只靠分析值通過時的文案。通過 PDR 後 `gate` 成為 `CDR`，定版工作可以開放。定版前重新更改設計會要求再送 PDR，首次通過的時間仍可從紀錄取得。通過 FRR 後進入 `flight`。退回時可依工作選單補正後再送，審查結果與採用的豁免 ID 寫入 `game.log[].review`。

## 分段飛行與結算

`segmentedFlight.segments` 依序定義階段。階段可從目前狀態與有效證據提供說明、選項和判定。無選項的階段以 `null` 執行。`resolve` 可以回傳 `report` 及下一段沿用的完整 `state`。選擇、報告及狀態會隨存檔保存，重整後從下一段開始。

最後一段完成或某段回傳 `failed: true` 時，由 `segmentedFlight.finish` 產生既有格式的 `FlightResult`。提早失敗時，引擎填入 `interruptedAt` 並結算為未交付，結果頁以階段標籤顯示中斷位置。`records(game)` 可從審查、飛行結果與本局狀態產生跨局紀錄，例如入軌案的 `onTime` 與 `verified`。既有進度機制負責合併紀錄、計算聲望與解鎖。

[測試任務](../tests/fixtures/mission-engine.ts) 示範可用於兩章的接法，涵蓋多週整合、有效期限、PDR 退回、FRR 豁免及分段結算。章節數值與門檻見[入軌火箭](story/orbital-launch.md#實作備註)與[登月](story/lunar-mission.md#實作備註)的實作備註。
