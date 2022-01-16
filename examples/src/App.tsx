import { Suspense } from 'react'
import styled from 'styled-components'
import { Link, Route, HashRouter as Router, Routes, useMatch } from 'react-router-dom'
import { Global } from './styles'

import * as demos from './demos'
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
const visibleComponents = Object.entries(demos).reduce<any>(
  (acc, [name, component]) => ({ ...acc, [name]: component }),
  {},
)
const DefaultComponent = visibleComponents[defaultName].Component

const RoutedComponent = () => {
  const {
    params: { name },
  } = useMatch('/demo/:name') || { params: { name: defaultName } }
  const Component = visibleComponents[name || defaultName].Component
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
      {Object.entries(visibleComponents).map(([name], key) => (
        <Link key={key} to={`/demo/${name}`} title={name}>
          <Spot style={{ backgroundColor: name === routeName ? 'salmon' : 'white' }} />
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
