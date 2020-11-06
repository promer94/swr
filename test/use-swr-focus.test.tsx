import { act, fireEvent, render, screen } from '@testing-library/react'
import React, { useState } from 'react'
import '@testing-library/jest-dom'
import useSWR from '../src'
import { sleep } from './utils'

describe('useSWR - focus', () => {
  it('should revalidate on focus by default', async () => {
    let value = 0
    const fetcher = jest.fn(() => value++)
    function Page() {
      const { data } = useSWR('dynamic-5', fetcher, {
        dedupingInterval: 0,
      })
      return <div>data: {data}</div>
    }
    const { container } = render(<Page />)

    // hydration
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: "`)
    // mount
    await screen.findByText( 'data: 0')
    expect(fetcher).toBeCalledTimes(1)
    fireEvent.focus(window)
    expect(fetcher).toBeCalledTimes(2)
    await screen.findByText( 'data: 1')
  })

  it("shouldn't revalidate on focus when revalidateOnFocus is false", async () => {
    let value = 0
    const fetcher = jest.fn(() => value++)
    function Page() {
      const { data } = useSWR('dynamic-6', fetcher, {
        dedupingInterval: 0,
        revalidateOnFocus: false,
      })
      return <div>data: {data}</div>
    }
    const { container } = render(<Page />)

    // hydration
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: "`)
    // mount
    await screen.findByText( 'data: 0')
    expect(fetcher).toBeCalledTimes(1)
    // trigger revalidation
    fireEvent.focus(window)
    await screen.findByText( 'data: 0')
    expect(fetcher).toBeCalledTimes(1)
  })
  it('revalidateOnFocus shoule be stateful', async () => {
    let value = 0
    const fetcher = jest.fn(() => value ++)
    function Page() {
      const [revalidateOnFocus, toggle] = useState(false)
      const { data } = useSWR('dynamic-revalidateOnFocus', fetcher, {
        dedupingInterval: 0,
        revalidateOnFocus,
        focusThrottleInterval: 0,
      })
      return <div onClick={() => toggle((s) => !s)}>data: {data}</div>
    }
    const { container, getByText } = render(<Page />)

    // hydration
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: "`)
    // mount
    await screen.findByText( 'data: 0')
    expect(fetcher).toBeCalledTimes(1)

    // trigger revalidation
    fireEvent.focus(window)
    await act(() => sleep(1))
    // data should not change
    expect(getByText('data: 0')).toBeInTheDocument()
    expect(fetcher).toBeCalledTimes(1)

    // change revalidateOnFocus to true
    fireEvent.click(container.firstElementChild)
    // trigger revalidation
    fireEvent.focus(window)
    
    expect(fetcher).toBeCalledTimes(2)
    await screen.findByText( 'data: 1')

    // trigger revalidation
    fireEvent.focus(window)
    
    expect(fetcher).toBeCalledTimes(3)
    await screen.findByText( 'data: 2')

    // change revalidateOnFocus to false
    fireEvent.click(container.firstElementChild)
    // trigger revalidation
    fireEvent.focus(window)

    await screen.findByText( 'data: 2')
    expect(fetcher).toBeCalledTimes(3)
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
          focusThrottleInterval: 200,
        }
      )
      return <div>data: {data}</div>
    }
    const { container } = render(<Page />)

    // hydration
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: "`)

    // mount
    await screen.findByText( 'data: 0')

    // trigger revalidation
    fireEvent.focus(window)
    await act(() => sleep(1))

    fireEvent.focus(window)
    await act(() => sleep(210))

    await screen.findByText( 'data: 1')

    fireEvent.focus(window)
    await act(() => sleep(1))

    await screen.findByText( 'data: 2')
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
          focusThrottleInterval,
        }
      )
      return <div onClick={() => setInterval((s) => s + 100)}>data: {data}</div>
    }
    const { container } = render(<Page />)

    // hydration
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"data: "`)

    // mount
    await screen.findByText( 'data: 0')

    // trigger revalidate data:1
    fireEvent.focus(window)
    await act(() => sleep(210))

    // trigger revalidate data:2
    fireEvent.focus(window)
    await act(() => sleep(210))

    await screen.findByText( 'data: 2')

    fireEvent.click(container.firstElementChild)

    // trigger revalidate data:3
    fireEvent.focus(window)
    await act(() => sleep(1))

    // not trigger revalidate data:3
    fireEvent.focus(window)
    await act(() => sleep(210))

    await screen.findByText( 'data: 3')

    await act(() => sleep(100))

    // trigger revalidate data:4
    fireEvent.focus(window)
    await act(() => sleep(310))

    // trigger revalidate data:4
    fireEvent.focus(window)
    await act(() => sleep(1))

    await screen.findByText( 'data: 5')
  })
})
