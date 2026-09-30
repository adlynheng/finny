import { act, waitFor } from '@testing-library/react-native';

import { FALLBACK_USD_SGD, FX_URL } from '@/lib/marketData';
import { queryKeys } from '@/lib/queryKeys';
import { useUsdSgd } from '../useUsdSgd';
import { renderHookWithClient } from '../../../test/queryTestUtils';

const fetchMock = global.fetch as jest.Mock;

const reply = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });

afterEach(() => fetchMock.mockReset());

it('reads USD/SGD from exchangerate.fun, stamped with when it was fetched', async () => {
  fetchMock.mockImplementation(() =>
    reply({ base: 'USD', timestamp: 1, rates: { SGD: 1.2764, EUR: 0.9 } }),
  );

  const { result } = await renderHookWithClient(() => useUsdSgd());

  await waitFor(() => expect(result.current.rate).toBe(1.2764));
  expect(result.current.fetchedAt).toBeInstanceOf(Date);
  expect(fetchMock).toHaveBeenCalledWith(FX_URL);
});

it('falls back, with no fetch time, until a first fetch succeeds', async () => {
  fetchMock.mockImplementation(() => reply({}, 503));

  const { result } = await renderHookWithClient(() => useUsdSgd());

  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(result.current).toEqual({ rate: FALLBACK_USD_SGD, fetchedAt: null });
});

it('treats a reply with no SGD rate as a failure', async () => {
  fetchMock.mockImplementation(() => reply({ rates: { EUR: 0.9 } }));

  const { result } = await renderHookWithClient(() => useUsdSgd());

  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(result.current.rate).toBe(FALLBACK_USD_SGD);
});

it('keeps the last good rate and its time when a refresh fails', async () => {
  fetchMock.mockImplementationOnce(() => reply({ rates: { SGD: 1.2764 } }));

  const { result, client } = await renderHookWithClient(() => useUsdSgd());
  await waitFor(() => expect(result.current.rate).toBe(1.2764));
  const { fetchedAt } = result.current;

  fetchMock.mockImplementation(() => Promise.reject(new Error('offline')));
  await act(() => client.refetchQueries({ queryKey: queryKeys.fx.usdSgd() }));

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(result.current).toEqual({ rate: 1.2764, fetchedAt });
});
