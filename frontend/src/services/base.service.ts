import { api, type ApiClient, type Paginated, type RequestConfig } from '@/platform/api';

/**
 * SERVICE LAYER base. A Service is a thin, typed binding to backend endpoints —
 * NO business logic, NO React. The layering is strict:
 *   Pages → hooks (query platform) → Services → API Platform → backend.
 * Components never import a Service or the api client directly.
 */
export abstract class BaseService {
  protected readonly api: ApiClient;
  constructor(client: ApiClient = api) {
    this.api = client;
  }
  protected paginate<T>(path: string, query?: RequestConfig['query'], config?: RequestConfig): Promise<Paginated<T>> {
    return this.api.paginate<T>(path, { ...config, query });
  }
}
