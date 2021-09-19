import React from 'react'
import useSWR from 'swr'
import { createKey, createResponse, renderWithConfig } from './utils'
import useSWRInfinite from 'swr/infinite'
describe('useSWR fetcher type', () => {
  it('key = string', async () => {
    function Page() {
      const key = createKey()
      const fetcher: (args: string) => Promise<string> = args =>
        createResponse(args, { delay: 100 })
      const { data } = useSWR(key, fetcher)
      return <div>data:{data}</div>
    }
    renderWithConfig(<Page />)
  })
  it('key = () => string', async () => {
    function Page() {
      const key = () => createKey()
      const fetcher: (args: string) => Promise<string> = args =>
        createResponse(args, { delay: 100 })
      const { data } = useSWR(key, fetcher)
      return <div>data:{data}</div>
    }
    renderWithConfig(<Page />)
  })
  it('key = Record<any, any>', async () => {
    function Page() {
      const key = {
        foo: createKey(),
        bar: 2
      }
      const fetcher: (args: typeof key) => Promise<typeof key> = args =>
        createResponse(args, { delay: 100 })

      const { data } = useSWR(key, fetcher)
      return <div>data:{data}</div>
    }
    renderWithConfig(<Page />)
  })
  it('key = () => Record<any, any>', async () => {
    function Page() {
      const key = () => ({
        foo: createKey(),
        bar: 2
      })
      const fetcher: (
        args: ReturnType<typeof key>
      ) => Promise<ReturnType<typeof key>> = args =>
        createResponse(args, { delay: 100 })
      const { data } = useSWR(key, fetcher)
      return <div>data:{data}</div>
    }
    renderWithConfig(<Page />)
  })
  it('key = Tuple', async () => {
    function Page() {
      const fetcher: (
        ...args: [string, { a: number; b: { c: string; d: [number, string] } }]
      ) => Promise<
        [string, { a: number; b: { c: string; d: [number, string] } }]
      > = (...args) => createResponse([...args], { delay: 100 })
      const { data } = useSWR(
        [createKey(), { a: 123, b: { c: 'foo', d: [1, 'bar'] } }],
        fetcher
      )
      return <div>data:{data}</div>
    }
    renderWithConfig(<Page />)
  })
  it('key = () => Tuple', async () => {
    function Page() {
      const fetcher: (
        ...args: [string, { a: number; b: { c: string; d: [number, string] } }]
      ) => Promise<
        [string, { a: number; b: { c: string; d: [number, string] } }]
      > = (...args) => createResponse([...args], { delay: 100 })
      const { data } = useSWR(
        () => [createKey(), { a: 123, b: { c: 'foo', d: [1, 'bar'] } }],
        fetcher
      )
      return <div>data:{data}</div>
    }
    renderWithConfig(<Page />)
  })
  it('key = readonly Tuple', async () => {
    function Page() {
      const fetcher: (
        ...args: [string, { a: 123; b: { c: 'foo'; d: [1, 'bar'] } }]
      ) => Promise<[string, { a: 123; b: { c: 'foo'; d: [1, 'bar'] } }]> = (
        ...args
      ) => createResponse([...args], { delay: 100 })
      const { data } = useSWR(
        [createKey(), { a: 123, b: { c: 'foo', d: [1, 'bar'] } }] as const,
        fetcher
      )
      return <div>data:{data}</div>
    }
    renderWithConfig(<Page />)
  })
  it('key = () => readonly Tuple', async () => {
    function Page() {
      const fetcher: (
        ...args: [string, { a: 123; b: { c: 'foo'; d: [1, 'bar'] } }]
      ) => Promise<[string, { a: 123; b: { c: 'foo'; d: [1, 'bar'] } }]> = (
        ...args
      ) => createResponse([...args], { delay: 100 })
      const { data } = useSWR(
        () =>
          [createKey(), { a: 123, b: { c: 'foo', d: [1, 'bar'] } }] as const,
        fetcher
      )
      return <div>data:{data}</div>
    }
    renderWithConfig(<Page />)
  })
})
describe('swr/infinite fetcher type', () => {
  it('key = () => string', async () => {
    function Page() {
      const key = () => createKey()
      const fetcher: (args: string) => Promise<string> = args =>
        createResponse(args, { delay: 100 })
      const { data } = useSWR(key, fetcher)
      return <div>data:{data}</div>
    }
    renderWithConfig(<Page />)
  })
  it('key = () => Record<any, any>', async () => {
    function Page() {
      const key = () => ({
        foo: createKey(),
        bar: 2
      })

      const { data } = useSWRInfinite(key, args => {
        console.log(args.foo.toLowerCase())
        console.log(args.bar.toFixed())
        return args
      })
      return <div>data:{data}</div>
    }
    renderWithConfig(<Page />)
  })
  it('key = () => Tuple', async () => {
    function Page() {
      const fetcher: (
        ...args: [string, { a: number; b: { c: string; d: [number, string] } }]
      ) => Promise<
        [string, { a: number; b: { c: string; d: [number, string] } }]
      > = (...args) => createResponse([...args], { delay: 100 })
      const { data } = useSWRInfinite(
        () => [createKey(), { a: 123, b: { c: 'foo', d: [1, 'bar'] } }],
        fetcher
      )
      return <div>data:{data}</div>
    }
    renderWithConfig(<Page />)
  })
  it('key = () => readonly Tuple', async () => {
    function Page() {
      const fetcher: (
        ...args: [string, { a: 123; b: { c: 'foo'; d: [1, 'bar'] } }]
      ) => Promise<[string, { a: 123; b: { c: 'foo'; d: [1, 'bar'] } }]> = (
        ...args
      ) => createResponse([...args], { delay: 100 })
      const { data } = useSWRInfinite(
        () =>
          [createKey(), { a: 123, b: { c: 'foo', d: [1, 'bar'] } }] as const,
        fetcher
      )
      return <div>data:{data}</div>
    }
    renderWithConfig(<Page />)
  })
})
