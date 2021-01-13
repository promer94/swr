import { act, fireEvent, render, screen } from '@testing-library/react'
import React, { useEffect, useState } from 'react'
import useSWR, { mutate } from '../src'
import { sleep } from './utils'

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

describe('useSWR - focus', () => {
  it('should revalidate on focus by default', async () => {
    let value = 0

    function Page() {
      const { data } = useSWR('dynamic-5', () => value++, {
        dedupingInterval: 0
      })
      return <div>data: {data}</div>
    }
    const { container } = render(<Page />)

    // hydration
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: "`)
    // mount
    await screen.findByText('data: 0')
    // trigger revalidation
    fireEvent.focus(window)
    await act(() => {
      return sleep(1)
    })
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: 1"`)
  })

  it("shouldn't revalidate on focus when revalidateOnFocus is false", async () => {
    let value = 0

    function Page() {
      const { data } = useSWR('dynamic-6', () => value++, {
        dedupingInterval: 0,
        revalidateOnFocus: false
      })
      return <div>data: {data}</div>
    }
    const { container } = render(<Page />)

    // hydration
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: "`)
    // mount
    await screen.findByText('data: 0')
    // trigger revalidation
    fireEvent.focus(window)
    await act(() => {
      return sleep(1)
    })
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: 0"`)
  })
  it('revalidateOnFocus shoule be stateful', async () => {
    let value = 0

    function Page() {
      const [revalidateOnFocus, toggle] = useState(false)
      const { data } = useSWR('dynamic-revalidateOnFocus', () => value++, {
        dedupingInterval: 0,
        revalidateOnFocus,
        focusThrottleInterval: 0
      })
      return <div onClick={() => toggle(s => !s)}>data: {data}</div>
    }
    const { container } = render(<Page />)

    // hydration
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: "`)
    // mount
    await screen.findByText('data: 0')

    // trigger revalidation
    fireEvent.focus(window)

    await act(() => {
      return sleep(1)
    })
    // data should not change
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: 0"`)

    // change revalidateOnFocus to true
    fireEvent.click(container.firstElementChild)
    // trigger revalidation
    fireEvent.focus(window)

    await act(() => {
      return sleep(1)
    })
    // data should update
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: 1"`)
    // trigger revalidation
    fireEvent.focus(window)

    await act(() => {
      return sleep(1)
    })
    // data should update
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: 2"`)

    // change revalidateOnFocus to false
    fireEvent.click(container.firstElementChild)
    // trigger revalidation
    fireEvent.focus(window)
    await act(() => {
      return sleep(1)
    })
    // data should not change
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: 2"`)
  })

  it('focusThrottleInterval should work', async () => {
    let value = 0

    function Page() {
      const { data } = useSWR(
        'focusThrottleInterval should work',
        () => value++,
        {
          dedupingInterval: 0,
          revalidateOnFocus: true,
          focusThrottleInterval: 200
        }
      )
      return <div>data: {data}</div>
    }
    const { container } = render(<Page />)

    // hydration
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: "`)
    // mount
    await screen.findByText('data: 0')
    // trigger revalidation
    fireEvent.focus(window)
    await act(() => {
      return sleep(1)
    })
    fireEvent.focus(window)
    await act(() => {
      return sleep(210)
    })

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: 1"`)
    fireEvent.focus(window)
    await act(() => {
      return sleep(1)
    })

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: 2"`)
  })

  it('focusThrottleInterval should be stateful', async () => {
    let value = 0

    function Page() {
      const [focusThrottleInterval, setInterval] = useState(200)
      const { data } = useSWR(
        'focusThrottleInterval should be stateful',
        () => value++,
        {
          dedupingInterval: 0,
          revalidateOnFocus: true,
          focusThrottleInterval
        }
      )
      return <div onClick={() => setInterval(s => s + 100)}>data: {data}</div>
    }
    const { container } = render(<Page />)

    // hydration
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: "`)
    // mount
    await screen.findByText('data: 0')

    fireEvent.focus(window)
    await act(() => {
      return sleep(210)
    })
    fireEvent.focus(window)
    await act(() => {
      return sleep(210)
    })

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: 2"`)
    fireEvent.click(container.firstElementChild)
    fireEvent.focus(window)
    await act(() => {
      return sleep(1)
    })
    fireEvent.focus(window)
    await act(() => {
      return sleep(210)
    })

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: 3"`)

    await act(() => {
      return sleep(100)
    })
    fireEvent.focus(window)
    await act(() => {
      return sleep(310)
    })
    fireEvent.focus(window)
    await act(() => {
      return sleep(1)
    })

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: 5"`)
  })
})
