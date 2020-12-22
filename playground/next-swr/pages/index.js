import React from 'react'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import useSWR from '../swr'

export default function Home() {
  const { data, error } = useSWR('/api/swr')

  if (error) return <>{'An error has occurred.'}</>
  if (!data) return <>{'Loading...'}</>

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <a href="https://nextjs.org">Next.js + SWR !</a>
        </h1>

        <div>
          <h1>{data.name}</h1>
          <p>{data.description}</p>
          <strong>👀 {data.subscribers_count}</strong>{' '}
          <strong>✨ {data.stargazers_count}</strong>{' '}
          <strong>🍴 {data.forks_count}</strong>
        </div>
      </main>
    </div>
  )
}
