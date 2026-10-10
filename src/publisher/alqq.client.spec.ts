import axios from 'axios';
import { AlqqSession } from './alqq.client';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

jest.mock('../common/const/Env', () => ({
  __esModule: true,
  default: {
    ALQQ_API_BASE: 'https://alqq.example.com',
    ALQQ_EXECUTOR: 'desktop',
  },
}));

describe('AlqqSession publish-logs', () => {
  let httpGet: jest.Mock;
  let session: AlqqSession;

  beforeEach(() => {
    httpGet = jest.fn();
    (axios.create as jest.Mock).mockReturnValue({ get: httpGet });
    session = new AlqqSession('test-key');
  });

  it('listPublishLogs 解析 data.logs', async () => {
    httpGet.mockResolvedValue({
      data: {
        data: {
          logs: [{ id: 1, metric_reads: 10 }],
        },
      },
    });

    const rows = await session.listPublishLogs({ ids: '1', pageSize: 20 });

    expect(httpGet).toHaveBeenCalledWith('/publish-logs', {
      params: {
        page: 1,
        page_size: 20,
        platform: undefined,
        ids: '1',
        status: undefined,
      },
    });
    expect(rows).toEqual([{ id: 1, metric_reads: 10 }]);
  });

  it('listPublishLogs 请求失败时返回空数组', async () => {
    httpGet.mockRejectedValue(new Error('network'));

    const rows = await session.listPublishLogs();

    expect(rows).toEqual([]);
  });

  it('listRecentPublishLogs 翻页直到不足一页', async () => {
    httpGet
      .mockResolvedValueOnce({
        data: {
          data: {
            items: Array.from({ length: 50 }, (_, i) => ({ id: i + 1 })),
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            items: [{ id: 51 }],
          },
        },
      });

    const rows = await session.listRecentPublishLogs({
      pageSize: 50,
      maxPages: 3,
    });

    expect(httpGet).toHaveBeenCalledTimes(2);
    expect(rows).toHaveLength(51);
    expect(rows[50]).toEqual({ id: 51 });
  });
});
