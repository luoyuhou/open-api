import axios from 'axios';

class FetchClient {
  private readonly instance = axios;

  public async get<T>(url: string): Promise<T> {
    const response = await this.instance.get(url);
    console.log('fetch get status', response.status);
    return response.data;
  }

  public async post<T>(
    url: string,
    payload: Record<string, never>,
  ): Promise<T> {
    const responses = await this.instance.post(url, payload);
    return responses.data;
  }
}

export default new FetchClient();
