/**
 * Fake HTTP transport for the host api singleton: an axios adapter, so the real
 * ApiClient (and its real ApiError) runs end to end. Unmatched paths answer 404.
 */
import { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { api } from '@/api';

const PRODUCTION_BASE_URL = '/api/v1';
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;

export type FakeRoutes = Record<string, unknown>;

/** Install ``routes`` (path relative to ``/api/v1`` → JSON body); returns the request log. */
export function installFakeTransport(routes: FakeRoutes): string[] {
  const requestedPaths: string[] = [];
  const transport = (api as unknown as { axiosInstance: AxiosInstance }).axiosInstance;
  transport.defaults.baseURL = PRODUCTION_BASE_URL;
  transport.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const path = config.url ?? '';
    requestedPaths.push(path);
    const found = Object.prototype.hasOwnProperty.call(routes, path);
    const status = found ? HTTP_OK : HTTP_NOT_FOUND;
    const response = { data: found ? routes[path] : { error: 'Not found' }, status, statusText: String(status), headers: {}, config };
    if (!found) {
      throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, {}, response);
    }
    return response;
  };
  return requestedPaths;
}
