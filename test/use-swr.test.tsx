import { act, render, screen } from '@testing-library/react'
import React, { useEffect } from 'react'
import '@testing-library/jest-dom'
import useSWR from '../src'
import { sleep } from './utils'

describe('useSWR', () => {
  it('should return `undefined` on hydration then return data', async () => {
    function Page() {
      const { data } = useSWR('constant-2', () => 'SWR')
      return <div>hello, {data}</div>
    }
    const { container } = render(<Page />)

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"hello, "`)
    await screen.findByText('hello, SWR')
  })

  it('should allow functions as key and reuse the cache', async () => {
    function Page() {
      const { data } = useSWR(
        () => 'constant-2',
        () => 'SWR'
      )
      return <div>hello, {data}</div>
    }
    const { container } = render(<Page />)
    expect(container.firstChild.textContent).toMatchInlineSnapshot(
      `"hello, SWR"`
    )
  })

  it('should allow async fetcher functions', async () => {
    const fetcher = jest.fn(
      () => new Promise((res) => setTimeout(() => res('SWR'), 200))
    )
    function Page() {
      const { data } = useSWR('constant-3', fetcher)
      return <div>hello, {data}</div>
    }
    const { container } = render(<Page />)

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"hello, "`)
    await act(() => sleep(210))
    expect(fetcher).toBeCalledTimes(1)
    await screen.findByText('hello, SWR')
  })

  it('should not call fetch function when revalidateOnMount is false', async () => {
    const fetch = jest.fn(() => 'SWR')

    function Page() {
      const { data } = useSWR('revalidateOnMount', fetch, {
        revalidateOnMount: false,
      })
      return <div>hello, {data}</div>
    }

    render(<Page />)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('should call fetch function when revalidateOnMount is true even if initialData is set', async () => {
    const fetch = jest.fn(() => 'SWR')

    function Page() {
      const { data } = useSWR('revalidateOnMount', fetch, {
        revalidateOnMount: true,
        initialData: 'gab',
      })
      return <div>hello, {data}</div>
    }

    render(<Page />)

    await screen.findByText('hello, SWR')
    expect(fetch).toHaveBeenCalled()
  })

  it('should dedupe requests by default', async () => {
    const fetcher = jest.fn(
      () => new Promise((res) => setTimeout(() => res('SWR'), 200))
    )

    function Page() {
      const { data: v1 } = useSWR('constant-4', fetcher)
      const { data: v2 } = useSWR('constant-4', fetcher)
      return (
        <div>
          {v1}, {v2}
        </div>
      )
    }
    const { container } = render(<Page />)

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`", "`)

    await act(() => sleep(210))

    expect(fetcher).toBeCalledTimes(1)

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"SWR, SWR"`)
  })

  it('should trigger the onSuccess event', async () => {
    const onSuccess = jest.fn()

    function Page() {
      const { data } = useSWR(
        'constant-5',
        () => new Promise((res) => setTimeout(() => res('SWR'), 200)),
        { onSuccess }
      )
      return <div>hello, {data}</div>
    }
    const { container } = render(<Page />)

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"hello, "`)

    await act(() => sleep(210))

    expect(onSuccess).toBeCalled()
    expect(container.firstChild.textContent).toMatchInlineSnapshot(
      `"hello, SWR"`
    )
  })

  it('should broadcast data', async () => {
    let cnt = 0

    function Block() {
      const { data } = useSWR('broadcast-1', () => cnt++, {
        refreshInterval: 100,
        // need to turn of deduping otherwise
        // refreshing will be ignored
        dedupingInterval: 10,
      })
      return <>{data}</>
    }
    function Page() {
      return (
        <>
          <Block /> <Block /> <Block />
        </>
      )
    }
    const { container } = render(<Page />)
    await act(() => sleep(10))
    expect(container.textContent).toMatchInlineSnapshot(`"0 0 0"`)
    await act(() => sleep(100))
    expect(container.textContent).toMatchInlineSnapshot(`"1 1 1"`)
    await act(() => sleep(100))
    expect(container.textContent).toMatchInlineSnapshot(`"2 2 2"`)
  })

  it('should broadcast error', async () => {
    let cnt = 0

    function Block() {
      const { data, error } = useSWR(
        'broadcast-2',
        () => {
          if (cnt === 2) throw new Error('err')
          return cnt++
        },
        {
          refreshInterval: 100,
          // need to turn of deduping otherwise
          // refreshing will be ignored
          dedupingInterval: 10,
        }
      )
      if (error) return error.message
      return <>{data}</>
    }
    function Page() {
      return (
        <>
          <Block /> <Block /> <Block />
        </>
      )
    }

    const { container } = render(<Page />)
    await act(() => sleep(10))
    expect(container.textContent).toMatchInlineSnapshot(`"0 0 0"`)
    await act(() => sleep(100))
    expect(container.textContent).toMatchInlineSnapshot(`"1 1 1"`)
    await act(() => sleep(100))
    expect(container.textContent).toMatchInlineSnapshot(`"err err err"`)
  })

  it('should broadcast isValidating', async () => {
    function useBroadcast3() {
      const { isValidating, mutate: change } = useSWR(
        'broadcast-3',
        () => new Promise((res) => setTimeout(res, 100)),
        {
          // need to turn of deduping otherwise
          // revalidating will be ignored
          dedupingInterval: 10,
        }
      )
      return { isValidating, mutate: change }
    }
    function Initiator() {
      const { isValidating, mutate: change } = useBroadcast3()
      useEffect(() => {
        const timeout = setTimeout(() => {
          change()
        }, 200)
        return () => clearTimeout(timeout)
      }, [])
      return <>{isValidating ? 'true' : 'false'}</>
    }
    function Consumer() {
      const { isValidating } = useBroadcast3()
      return <>{isValidating ? 'true' : 'false'}</>
    }
    function Page() {
      return (
        <>
          <Initiator /> <Consumer /> <Consumer />
        </>
      )
    }
    const { container } = render(<Page />)

    expect(container.textContent).toMatchInlineSnapshot(`"true true true"`)
    await act(() => sleep(100))
    expect(container.textContent).toMatchInlineSnapshot(`"false false false"`)
    await act(() => sleep(100))
    expect(container.textContent).toMatchInlineSnapshot(`"true true true"`)
    await act(() => sleep(100))
    expect(container.textContent).toMatchInlineSnapshot(`"false false false"`)
  })

  it('should accept object args', async () => {
    const obj = { v: 'hello' }
    const arr = ['world']

    function Page() {
      const { data: v1 } = useSWR(
        ['args-1', obj, arr],
        (a, b, c) => a + b.v + c[0]
      )

      // reuse the cache
      const { data: v2 } = useSWR(['args-1', obj, arr], () => 'not called!')

      // different object
      const { data: v3 } = useSWR(
        ['args-2', obj, 'world'],
        (a, b, c) => a + b.v + c
      )

      return (
        <div>
          {v1}, {v2}, {v3}
        </div>
      )
    }

    render(<Page />)
    await screen.findByText(
      'args-1helloworld, args-1helloworld, args-2helloworld'
    )
  })

  it('should accept function returning args', async () => {
    const obj = { v: 'hello' }
    const arr = ['world']

    function Page() {
      const { data } = useSWR(
        () => ['args-3', obj, arr],
        (a, b, c) => a + b.v + c[0]
      )

      return <div>{data}</div>
    }

    render(<Page />)

    await screen.findByText('args-3helloworld')
  })

  it('should accept initial data', async () => {
    const fetcher = jest.fn(() => 'SWR')

    function Page() {
      const { data } = useSWR('initial-data-1', fetcher, {
        initialData: 'Initial',
      })
      return <div>hello, {data}</div>
    }

    const { container } = render(<Page />)

    expect(fetcher).not.toBeCalled()
    expect(container.firstChild.textContent).toMatchInlineSnapshot(
      `"hello, Initial"`
    )
  })

  it('should set config as second parameter', async () => {
    const fetcher = jest.fn(() => 'SWR')

    function Page() {
      const { data } = useSWR('config-as-second-param', {
        fetcher,
      })

      return <div>hello, {data}</div>
    }

    const { container } = render(<Page />)

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"hello, "`)
    expect(fetcher).toBeCalled()

    await screen.findByText('hello, SWR')
  })
})