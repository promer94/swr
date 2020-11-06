import { act, fireEvent, render, screen } from '@testing-library/react'
import React, { useEffect, useState } from 'react'
import useSWR from '../src'
import { sleep } from './utils'

describe('useSWR - refresh', () => {
  it('should rerender automatically on interval', async () => {
    let count = 0

    function Page() {
      const { data } = useSWR('dynamic-1', () => count++, {
        refreshInterval: 200,
        dedupingInterval: 100,
      })
      return <div>count: {data}</div>
    }
    const { container } = render(<Page />)

    // hydration
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: "`)

    await screen.findByText('count: 0')

    await act(() => sleep(210)) // update
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 1"`)

    await act(() => sleep(50)) // no update
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 1"`)

    await act(() => sleep(150)) // update
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 2"`)
  })

  it('should dedupe requests combined with intervals', async () => {
    let count = 0

    function Page() {
      const { data } = useSWR('dynamic-2', () => count++, {
        refreshInterval: 200,
        dedupingInterval: 300,
      })
      return <div>count: {data}</div>
    }
    const { container } = render(<Page />)

    // hydration
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: "`)

    // mount
    await screen.findByText('count: 0')

    await act(() => sleep(210)) // no update (deduped)
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 0"`)
    await act(() => sleep(200)) // update
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 1"`)
    await act(() => sleep(200)) // no update (deduped)
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 1"`)
    await act(() => sleep(200)) // update
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 2"`)
  })

  it('should update data upon interval changes', async () => {
    let count = 0
    function Page() {
      const [int, setInt] = React.useState(200)
      const { data } = useSWR('/api', () => count++, {
        refreshInterval: int,
        dedupingInterval: 100,
      })
      return (
        <div onClick={() => setInt((num) => (num < 400 ? num + 100 : 0))}>
          count: {data}
        </div>
      )
    }
    const { container } = render(<Page />)

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: "`)

    // mount
    await screen.findByText('count: 0')

    await act(() => sleep(200))
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 1"`)

    await act(() => sleep(50))
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 1"`)

    await act(() => sleep(150))
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 2"`)

    fireEvent.click(container.firstElementChild)
    await act(() => {
      // it will clear 200ms timer and setup a new 300ms timer
      return sleep(200)
    })

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 2"`)

    await act(() => sleep(110))

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 3"`)

    await act(() => sleep(310))
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 4"`)

    fireEvent.click(container.firstElementChild)
    await act(() => {
      // it will clear 300ms timer and setup a new 400ms timer
      return sleep(300)
    })
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 4"`)
    await act(() => sleep(110))
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 5"`)

    fireEvent.click(container.firstElementChild)

    await act(() => sleep(110))

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 5"`)
    await act(() => sleep(110))
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"count: 5"`)
  })

  it('should update data upon interval changes -- changes happened during revalidate', async () => {
    let count = 0
    const STOP_POLLING_THRESHOLD = 2
    function Page() {
      const [flag, setFlag] = useState(0)
      const shouldPoll = flag < STOP_POLLING_THRESHOLD
      const { data } = useSWR(
        '/interval-changes-during-revalidate',
        () => count++,
        {
          refreshInterval: shouldPoll ? 200 : 0,
          dedupingInterval: 100,
          onSuccess() {
            setFlag((value) => value + 1)
          },
        }
      )
      return (
        <div onClick={() => setFlag(0)}>
          count: {data} {flag}
        </div>
      )
    }
    const { container } = render(<Page />)
    expect(container.firstChild.textContent).toMatchInlineSnapshot(
      `"count:  0"`
    )

    await screen.findByText('count: 0 1')

    await act(() => sleep(200))

    expect(container.firstChild.textContent).toMatchInlineSnapshot(
      `"count: 1 2"`
    )

    await act(() => sleep(200))
    expect(container.firstChild.textContent).toMatchInlineSnapshot(
      `"count: 1 2"`
    )

    await act(() => sleep(200))
    expect(container.firstChild.textContent).toMatchInlineSnapshot(
      `"count: 1 2"`
    )

    await act(() => sleep(200))
    expect(container.firstChild.textContent).toMatchInlineSnapshot(
      `"count: 1 2"`
    )

    fireEvent.click(container.firstElementChild)

    await act(() => {
      // it will setup a new 200ms timer
      return sleep(100)
    })

    expect(container.firstChild.textContent).toMatchInlineSnapshot(
      `"count: 1 0"`
    )

    await act(() => sleep(100))

    expect(container.firstChild.textContent).toMatchInlineSnapshot(
      `"count: 2 1"`
    )

    await act(() => sleep(200))

    expect(container.firstChild.textContent).toMatchInlineSnapshot(
      `"count: 3 2"`
    )

    await act(() => sleep(200))

    expect(container.firstChild.textContent).toMatchInlineSnapshot(
      `"count: 3 2"`
    )

    await act(() => sleep(200))

    expect(container.firstChild.textContent).toMatchInlineSnapshot(
      `"count: 3 2"`
    )
  })

  it('should allow use custom isEqual method', async () => {
    let count = 0
    const fetcher = jest.fn(() => ({
      timestamp: ++count,
      version: '1.0',
    }))
    function Page() {
      const { data, mutate: change } = useSWR('dynamic-11', fetcher, {
        compare: function isEqual(a, b) {
          if (a === b) {
            return true
          }
          if (!a || !b) {
            return false
          }
          return a.version === b.version
        },
      })

      if (!data) {
        return <div>loading</div>
      }
      return <button onClick={() => change()}>{data.timestamp}</button>
    }

    const { container } = render(<Page />)

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"loading"`)

    await screen.findByText('1')
    expect(fetcher).toBeCalledTimes(1)
    expect(fetcher).toReturnWith({
      timestamp: 1,
      version: '1.0',
    })

    fireEvent.click(container.firstElementChild)
    await act(() => sleep(1))
    expect(fetcher).toBeCalledTimes(2)
    expect(fetcher).toReturnWith({
      timestamp: 2,
      version: '1.0',
    })
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"1"`)
  })
})
