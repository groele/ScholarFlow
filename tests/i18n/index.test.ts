import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 模拟chrome.storage.local API（i18n模块通过@storage/settings使用chrome API）
const mockStorage: Record<string, any> = {};
vi.stubGlobal('chrome', {
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
  runtime: { sendMessage: vi.fn(async () => {}) },
});

// 在chrome mock之后导入i18n模块
import { t } from '../../src/i18n';
import { en } from '../../src/i18n/en';
import { zh } from '../../src/i18n/zh';

describe('t() - 翻译函数', () => {
  // 测试：默认语言下应返回英文值
  it('默认语言下应返回英文值', () => {
    const result = t('common.save');
    expect(result).toBe('Save');
  });

  // 测试：传入params时应替换模板变量
  it('传入 params 时应替换 {{}} 模板变量', () => {
    // 使用包含模板变量的key
    const result = t('citations.importSuccess', { count: '5', file: 'refs.bib' });
    expect(result).toContain('5');
    expect(result).toContain('refs.bib');
  });

  // 测试：不存在的key应返回key本身作为回退
  it('不存在的 key 应返回 key 本身', () => {
    const result = t('nonexistent.key' as any);
    expect(result).toBe('nonexistent.key');
  });

  // 测试：params中的变量应全部被替换
  it('多个模板变量应全部被替换', () => {
    const result = t('citations.importSuccess', { count: 10, file: 'data.ris' });
    expect(result).not.toContain('{{count}}');
    expect(result).not.toContain('{{file}}');
  });
});

describe('翻译文件完整性', () => {
  // 测试：中文翻译应包含所有英文key
  it('中文翻译文件应包含所有英文 key', () => {
    const enKeys = Object.keys(en) as Array<keyof typeof en>;
    const zhKeys = Object.keys(zh);
    for (const key of enKeys) {
      expect(zhKeys).toContain(key);
    }
  });

  // 测试：英文和中文key数量应一致
  it('英文和中文的 key 数量应一致', () => {
    expect(Object.keys(en).length).toBe(Object.keys(zh).length);
  });

  // 测试：中文翻译值不应与英文相同（排除纯英文术语）
  it('中文翻译中应有明确的中文内容', () => {
    // 检查几个关键的中文翻译
    expect(zh['common.save']).toBe('保存');
    expect(zh['common.cancel']).toBe('取消');
    expect(zh['settings.title']).toBe('设置');
  });

  // 测试：英文翻译值应为预期的英文
  it('英文翻译应为预期的英文', () => {
    expect(en['common.save']).toBe('Save');
    expect(en['common.cancel']).toBe('Cancel');
    expect(en['settings.title']).toBe('Settings');
  });
});
