import { describe, expect, test } from "bun:test"
import { buildTipKeys } from "../../../../src/cli/cmd/tui/feature-plugins/home/tips-view"
import { dict as en } from "../../../../src/cli/cmd/tui/i18n/en"
import { dict as es } from "../../../../src/cli/cmd/tui/i18n/es"
import { dict as fr } from "../../../../src/cli/cmd/tui/i18n/fr"
import { dict as ja } from "../../../../src/cli/cmd/tui/i18n/ja"
import { dict as ru } from "../../../../src/cli/cmd/tui/i18n/ru"
import { dict as zh } from "../../../../src/cli/cmd/tui/i18n/zh"
import { dict as zht } from "../../../../src/cli/cmd/tui/i18n/zht"
import { FREE_API_SUNSET_AT, isFreeApiSunset } from "../../../../src/cli/cmd/tui/util/free-api-sunset"

// buildTipKeys assembles the weighted tip pool. The Tab-cycle tip must only
// mention the Orchestrator agent when the experiment flag is on; otherwise the
// Orchestrator-free variant is used so we never point users at an unreachable
// agent.
describe("buildTipKeys", () => {
  test("omits the Orchestrator tab tip when the flag is off", () => {
    const keys = buildTipKeys({ orchestratorEnabled: false, platform: "linux", sunset: false, xiaomiConnected: false })
    expect(keys).toContain("tui.tips.tab_agent")
    expect(keys).not.toContain("tui.tips.tab_agent_orchestrator")
  })

  test("uses the Orchestrator tab tip when the flag is on", () => {
    const keys = buildTipKeys({ orchestratorEnabled: true, platform: "linux", sunset: false, xiaomiConnected: false })
    expect(keys).toContain("tui.tips.tab_agent_orchestrator")
    expect(keys).not.toContain("tui.tips.tab_agent")
  })

  test("preserves platform and Orchestrator variants before and after sunset", () => {
    for (const sunset of [false, true]) {
      for (const orchestratorEnabled of [false, true]) {
        for (const platform of ["win32", "darwin", "linux"] as const) {
          const keys = buildTipKeys({ orchestratorEnabled, platform, sunset, xiaomiConnected: true })
          expect(keys.filter((key) => key.startsWith("tui.tips.tab_agent"))).toEqual([
            orchestratorEnabled ? "tui.tips.tab_agent_orchestrator" : "tui.tips.tab_agent",
          ])
          expect(keys).toContain(platform === "win32" ? "tui.tips.suspend.win" : "tui.tips.suspend.unix")
        }
      }
    }
  })

  test("keeps the free-model promotion before sunset", () => {
    const keys = buildTipKeys({
      orchestratorEnabled: false,
      platform: "linux",
      sunset: isFreeApiSunset(FREE_API_SUNSET_AT - 1),
      xiaomiConnected: false,
    })
    expect(keys).toContain("tui.tips.free_models")
    expect(keys).not.toContain("tui.tips.free_api_sunset")
  })

  test("replaces the free-model promotion at and after sunset for logged-out users", () => {
    for (const now of [FREE_API_SUNSET_AT, FREE_API_SUNSET_AT + 1]) {
      const keys = buildTipKeys({
        orchestratorEnabled: false,
        platform: "linux",
        sunset: isFreeApiSunset(now),
        xiaomiConnected: false,
      })
      expect(keys).not.toContain("tui.tips.free_models")
      expect(keys).toContain("tui.tips.free_api_sunset")
    }
  })

  test("removes both free API tips after sunset for Xiaomi users", () => {
    const keys = buildTipKeys({ orchestratorEnabled: false, platform: "linux", sunset: true, xiaomiConnected: true })
    expect(keys).not.toContain("tui.tips.free_models")
    expect(keys).not.toContain("tui.tips.free_api_sunset")
  })
})

describe("free API sunset translations", () => {
  test("tell users to log in or configure a third-party API in all seven locales", () => {
    for (const [dict, thirdPartyApi] of [
      [en, "third-party API"],
      [es, "API de terceros"],
      [fr, "API tierce"],
      [ja, "サードパーティ API"],
      [ru, "сторонний API"],
      [zh, "第三方 API"],
      [zht, "第三方 API"],
    ] as const) {
      expect(dict["tui.tips.free_api_sunset"]).toContain("/login")
      expect(dict["tui.tips.free_api_sunset"]).toContain(thirdPartyApi)
    }
  })
})
