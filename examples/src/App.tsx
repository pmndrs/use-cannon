import { Suspense } from 'react'
import { HashRouter as Router, Link, Route, Routes, useMatch } from 'react-router-dom'
import styled from 'styled-components'

import { demoList, demos, isDemo } from './demos'
import { Global } from './styles'
import { Page as PageImpl } from './styles'

const Page = styled(PageImpl)`
  padding: 0px;

  & > h1 {
    position: absolute;
    top: 70px;
    left: 60px;
  }

  & > a {
    position: absolute;
    bottom: 60px;
    right: 60px;
    font-size: 1.2em;
  }
`

const defaultName = 'MondayMorning'
const visibleComponents = demos
const DefaultComponent = visibleComponents[defaultName].Component

const RoutedComponent = () => {
  const {
    params: { name: routeName },
  } = useMatch('/demo/:name') || { params: { name: defaultName } }
  const demoName = isDemo(routeName) ? routeName : defaultName
  const { Component } = visibleComponents[demoName]
  return <Component />
}

function Intro() {
  return (
    <Page>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/*" element={<DefaultComponent />} />
          <Route path="/demo/:name" element={<RoutedComponent />} />
        </Routes>
      </Suspense>
      <Demos />
      <a href="https://github.com/pmndrs/use-cannon" style={{ color: 'white' }}>
        Github
      </a>
    </Page>
  )
}

function Demos() {
  const {
    params: { name: routeName },
  } = useMatch('/demo/:name') || { params: { name: defaultName } }
  return (
    <DemoPanel>
      {demoList.map((demoName, key) => (
        <Link key={key} to={`/demo/${demoName}`} title={demoName}>
          <Spot style={{ backgroundColor: demoName === routeName ? 'salmon' : 'white' }} />
        </Link>
      ))}
    </DemoPanel>
  )
}

export default function App() {
  return (
    <Router>
      <Global />
      <Intro />
    </Router>
  )
}

const DemoPanel = styled.div`
  position: absolute;
  bottom: 50px;
  left: 50px;
  max-width: 250px;
`

const Spot = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin: 8px;
`
