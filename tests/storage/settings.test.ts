import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 模拟chrome.storage.local API
const mockStorage: Record<string, any> = {};
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(async (keys: string[]) => {
        const result: Record<string, any> = {};
        keys.forEach(k => {
          if (k in mockStorage) result[k] = mockStorage[k];
        });
        return result;
      }),
      set: vi.fn(async (data: Record<string, any>) => {
        Object.assign(mockStorage, data);
      }),
    },
  },
  runtime: {
    sendMessage: vi.fn(async () => {}),
  },
};

vi.stubGlobal('chrome', mockChrome);

import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type ExtensionSettings,
} from '../../src/storage/settings';

describe('DEFAULT_SETTINGS - 默认设置', () => {
  // 测试：默认同步提供者应为本地
  it('默认同步提供者应为 local', () => {
    expect(DEFAULT_SETTINGS.syncProviders.metadata.provider).toBe('local');
    expect(DEFAULT_SETTINGS.syncProviders.files.provider).toBe('local');
  });

  // 测试：默认AI设置应包含必要字段
  it('默认 AI 设置应包含必要字段', () => {
    expect(DEFAULT_SETTINGS.ai.provider).toBe('openai');
    expect(DEFAULT_SETTINGS.ai.endpoint).toContain('api.openai.com');
    expect(DEFAULT_SETTINGS.ai.model).toBe('gpt-4o');
  });

  // 测试：默认个人资料语言应为英文
  it('默认个人资料语言应为 en', () => {
    expect(DEFAULT_SETTINGS.profile.language).toBe('en');
  });

  // 测试：默认期刊门户应包含预设的四个
  it('默认期刊门户应包含 ACS、Wiley、APL、Nature', () => {
    const names = DEFAULT_SETTINGS.journalPortals.map(p => p.name);
    expect(names).toContain('ACS');
    expect(names).toContain('Wiley');
    expect(names).toContain('APL');
    expect(names).toContain('Nature');
    expect(DEFAULT_SETTINGS.journalPortals).toHaveLength(4);
  });

  // 测试：默认期刊门户应有一个默认项
  it('默认期刊门户中至少有一个 isDefault 为 true', () => {
    const defaults = DEFAULT_SETTINGS.journalPortals.filter(p => p.isDefault);
    expect(defaults.length).toBeGreaterThanOrEqual(1);
  });
});

describe('loadSettings - 加载设置', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    vi.clearAllMocks();
  });

  // 测试：存储为空时应返回默认设置
  it('存储为空时应返回默认设置', async () => {
    const settings = await loadSettings();
    expect(settings.ai.provider).toBe('openai');
    expect(settings.profile.language).toBe('en');
    expect(settings.syncProviders.metadata.provider).toBe('local');
  });

  // 测试：存储中有自定义设置时应深度合并
  it('应深度合并存储中的自定义设置', async () => {
    mockStorage.settings = {
      ai: { provider: 'deepseek', apiKey: 'sk-test' },
    };
    const settings = await loadSettings();
    expect(settings.ai.provider).toBe('deepseek');
    expect(settings.ai.apiKey).toBe('sk-test');
    // 保留默认值
    expect(settings.ai.endpoint).toBe('https://api.openai.com/v1');
    expect(settings.profile.language).toBe('en');
  });

  // 测试：应调用chrome.storage.local.get
  it('应调用 chrome.storage.local.get', async () => {
    await loadSettings();
    expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['settings']);
  });
});

describe('saveSettings - 保存设置', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    vi.clearAllMocks();
  });

  // 测试：应将合并后的设置写入存储
  it('应将合并后的设置写入存储', async () => {
    await saveSettings({ ai: { provider: 'deepseek', apiKey: 'sk-new', endpoint: '', model: '' } });
    expect(mockChrome.storage.local.set).toHaveBeenCalled();
    const saved = mockStorage.settings;
    expect(saved.ai.provider).toBe('deepseek');
    // 保留默认配置中的其他字段
    expect(saved.profile.language).toBe('en');
  });

  // 测试：应发送 SETTINGS_UPDATED 消息
  it('应发送 SETTINGS_UPDATED 消息通知页面更新', async () => {
    await saveSettings({ profile: { ...DEFAULT_SETTINGS.profile, language: 'zh' } });
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SETTINGS_UPDATED' })
    );
  });
});
