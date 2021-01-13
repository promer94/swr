import { act, fireEvent, render, screen } from '@testing-library/react'
import React, { useEffect, useState } from 'react'
import useSWR, { mutate } from '../src'
import { sleep } from './utils'

describe('useSWR - revalidate', () => {
  it('should rerender after triggering revalidation', async () => {
    let value = 0

    function Page() {
      const { data, revalidate } = useSWR('dynamic-3', () => value++)
      return <button onClick={revalidate}>data: {data}</button>
    }
    const { container } = render(<Page />)

    // hydration
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: "`)
    // mount
    await screen.findByText('data: 0')
    fireEvent.click(container.firstElementChild)
    await act(() => {
      // trigger revalidation
      return sleep(1)
    })
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: 1"`)
  })

  it('should revalidate all the hooks with the same key', async () => {
    let value = 0

    function Page() {
      const { data: v1, revalidate } = useSWR('dynamic-4', () => value++)
      const { data: v2 } = useSWR('dynamic-4', () => value++)
      return (
        <button onClick={revalidate}>
          {v1}, {v2}
        </button>
      )
    }
    const { container } = render(<Page />)

    // hydration
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`", "`)
    // mount
    await screen.findByText('0, 0')

    fireEvent.click(container.firstElementChild)

    await act(() => {
      // trigger revalidation
      return sleep(1)
    })
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"1, 1"`)
  })

  it('should respect sequences of revalidation calls (cope with race condition)', async () => {
    let faster = false

    function Page() {
      const { data, revalidate } = useSWR(
        'race',
        () =>
          new Promise(res => {
            const value = faster ? 1 : 0
            setTimeout(() => res(value), faster ? 100 : 200)
          })
      )

      return <button onClick={revalidate}>{data}</button>
    }

    const { container } = render(<Page />)

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`""`)

    // trigger the slower revalidation
    faster = false
    fireEvent.click(container.firstElementChild)

    await act(async () => sleep(10))
    // trigger the faster revalidation
    faster = true
    fireEvent.click(container.firstElementChild)

    await act(async () => sleep(210))
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"1"`)
  })

  it('should keep isValidating be true when there are two concurrent requests', async () => {
    function Page() {
      const { isValidating, revalidate } = useSWR(
        'keep isValidating for concurrent requests',
        () =>
          new Promise(res => {
            setTimeout(res, 200)
          }),
        { revalidateOnMount: false }
      )

      return (
        <button onClick={revalidate}>{isValidating ? 'true' : 'false'}</button>
      )
    }

    const { container } = render(<Page />)
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"false"`)

    // trigger the first revalidation
    fireEvent.click(container.firstElementChild)
    await act(() => sleep(100))
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"true"`)

    fireEvent.click(container.firstElementChild)
    await act(() => sleep(110))
    // first revalidation is over, second revalidation is still in progress
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"true"`)

    await act(() => sleep(100))
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"false"`)
  })
})

describe('useSWR - error', () => {
  it('should handle errors', async () => {
    function Page() {
      const { data, error } = useSWR(
        'error-1',
        () =>
          new Promise((_, rej) =>
            setTimeout(() => rej(new Error('error!')), 200)
          )
      )
      if (error) return <div>{error.message}</div>
      return <div>hello, {data}</div>
    }
    const { container } = render(<Page />)

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"hello, "`)
    // mount
    await screen.findByText('error!')
  })

  it('should trigger the onError event', async () => {
    let erroredSWR = null
    function Page() {
      const { data, error } = useSWR(
        'error-2',
        () =>
          new Promise((_, rej) =>
            setTimeout(() => rej(new Error('error!')), 200)
          ),
        { onError: (_, key) => (erroredSWR = key) }
      )
      if (error) return <div>{error.message}</div>
      return <div>hello, {data}</div>
    }
    const { container } = render(<Page />)

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"hello, "`)
    // mount
    await screen.findByText('error!')
    expect(erroredSWR).toEqual('error-2')
  })

  it('should trigger error retry', async () => {
    let count = 0
    function Page() {
      const { data, error } = useSWR(
        'error-3',
        () => {
          return new Promise((_, rej) =>
            setTimeout(() => rej(new Error('error: ' + count++)), 100)
          )
        },
        {
          onErrorRetry: (_, __, ___, revalidate, revalidateOpts) => {
            setTimeout(() => revalidate(revalidateOpts), 100)
          },
          dedupingInterval: 0
        }
      )
      if (error) return <div>{error.message}</div>
      return <div>hello, {data}</div>
    }
    const { container } = render(<Page />)

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"hello, "`)
    // mount
    await screen.findByText('error: 0')
    await act(() => sleep(210)) // retry
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"error: 1"`)
    await act(() => sleep(210)) // retry
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"error: 2"`)
  })

  it('should trigger the onLoadingSlow and onSuccess event', async () => {
    let loadingSlow = null,
      success = null
    function Page() {
      const { data } = useSWR(
        'error-4',
        () => new Promise(res => setTimeout(() => res('SWR'), 200)),
        {
          onLoadingSlow: key => (loadingSlow = key),
          onSuccess: (_, key) => (success = key),
          loadingTimeout: 100
        }
      )
      return <div>hello, {data}</div>
    }
    const { container } = render(<Page />)

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"hello, "`)
    expect(loadingSlow).toEqual(null)
    await act(() => sleep(110)) // slow
    expect(loadingSlow).toEqual('error-4')
    expect(success).toEqual(null)
    await act(() => sleep(100)) // finish
    expect(success).toEqual('error-4')
    expect(container.firstChild.textContent).toMatchInlineSnapshot(
      `"hello, SWR"`
    )
  })
  it('should trigger limited error retries if errorRetryCount exists', async () => {
    let count = 0
    function Page() {
      const { data, error } = useSWR(
        'error-5',
        () => {
          return new Promise((_, rej) =>
            setTimeout(() => rej(new Error('error: ' + count++)), 100)
          )
        },
        {
          errorRetryCount: 1,
          errorRetryInterval: 50,
          dedupingInterval: 0
        }
      )
      if (error) return <div>{error.message}</div>
      return <div>hello, {data}</div>
    }
    const { container } = render(<Page />)

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"hello, "`)
    // mount
    await screen.findByText('error: 0')

    await act(() => sleep(210)) // retry
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"error: 1"`)
    await act(() => sleep(210)) // retry
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"error: 1"`)
  })

  it('should not trigger the onLoadingSlow and onSuccess event after component unmount', async () => {
    let loadingSlow = null,
      success = null
    function Page() {
      const { data } = useSWR(
        'error-6',
        () => new Promise(res => setTimeout(() => res('SWR'), 200)),
        {
          onLoadingSlow: key => {
            loadingSlow = key
          },
          onSuccess: (_, key) => {
            success = key
          },
          loadingTimeout: 100
        }
      )
      return <div>{data}</div>
    }

    function App() {
      const [on, toggle] = useState(true)
      return (
        <div id="app" onClick={() => toggle(s => !s)}>
          {on && <Page />}
        </div>
      )
    }

    const { container } = render(<App />)

    expect(loadingSlow).toEqual(null)
    expect(success).toEqual(null)

    await act(async () => sleep(10))
    fireEvent.click(container.firstElementChild)
    await act(async () => sleep(200))

    expect(success).toEqual(null)
    expect(loadingSlow).toEqual(null)
  })

  it('should not trigger the onError and onErrorRetry event after component unmount', async () => {
    let retry = null,
      failed = null
    function Page() {
      const { data } = useSWR(
        'error-7',
        () =>
          new Promise((_, rej) =>
            setTimeout(() => rej(new Error('error!')), 200)
          ),
        {
          onError: (_, key) => {
            failed = key
          },
          onErrorRetry: (_, key) => {
            retry = key
          },
          dedupingInterval: 0
        }
      )
      return <div>{data}</div>
    }

    function App() {
      const [on, toggle] = useState(true)
      return (
        <div id="app" onClick={() => toggle(s => !s)}>
          {on && <Page />}
        </div>
      )
    }

    const { container } = render(<App />)

    expect(retry).toEqual(null)
    expect(failed).toEqual(null)

    await act(async () => sleep(10))
    fireEvent.click(container.firstElementChild)
    await act(async () => sleep(200))

    expect(retry).toEqual(null)
    expect(failed).toEqual(null)
  })

  it('should not trigger error retries if errorRetryCount is set to 0', async () => {
    let count = 0
    function Page() {
      const { data, error } = useSWR(
        'error-8',
        () => {
          return new Promise((_, rej) =>
            setTimeout(() => rej(new Error('error: ' + count++)), 100)
          )
        },
        {
          errorRetryCount: 0,
          errorRetryInterval: 50,
          dedupingInterval: 0
        }
      )
      if (error) return <div>{error.message}</div>
      return <div>hello, {data}</div>
    }
    const { container } = render(<Page />)

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"hello, "`)
    // mount
    await screen.findByText('error: 0')
    await act(() => sleep(210)) // retry
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"error: 0"`)
  })

  it('should not clear error during revalidating until fetcher is finished successfully', async () => {
    const errors = []
    const key = 'error-9'
    function Page() {
      const { error } = useSWR(
        key,
        () => {
          return new Promise((_, rej) => rej(new Error('error')))
        },
        {
          errorRetryCount: 0,
          errorRetryInterval: 0,
          dedupingInterval: 0
        }
      )
      useEffect(() => {
        errors.push(error ? error.message : null)
      }, [error])

      return <div>hello, {error ? error.message : null}</div>
    }

    render(<Page />)

    // mount
    await screen.findByText('hello, error')

    await act(() => {
      return mutate(key, undefined, true)
    })
    // initial -> first error -> mutate -> receive another error
    // error won't be cleared during revalidation
    expect(errors).toEqual([null, 'error', 'error'])
  })
})
