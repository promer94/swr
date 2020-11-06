import { act, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import useSWR from '../src'
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
    await screen.findByText('data: 0')
    fireEvent.click(container.firstElementChild)
    await act(() => sleep(1))
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
    await act(() => sleep(1))
    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"1, 1"`)
  })

  it('should respect sequences of revalidation calls (cope with race condition)', async () => {
    let faster = false

    function Page() {
      const { data, revalidate } = useSWR(
        'race',
        () =>
          new Promise((res) => {
            const value = faster ? 1 : 0
            setTimeout(() => res(value), faster ? 100 : 200)
          })
      )

      return <button onClick={revalidate}>{data}</button>
    }

    const { container } = render(<Page />)

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`""`)
    //mounted
    await screen.findByText('0')

    // trigger the slower revalidation
    act(() => {
      faster = false
    })
    fireEvent.click(container.firstElementChild)
    await act(() => sleep(10))

    // trigger the faster revalidation
    act(() => {
      faster = true
    })
    fireEvent.click(container.firstElementChild)
    await act(() => sleep(210))

    expect(container.firstChild.textContent).toMatchInlineSnapshot(`"1"`)
  })
})
