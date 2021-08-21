import { Suspense } from 'react'
import styled from 'styled-components'
import { HashRouter as Router, Link, Route, Switch, useRouteMatch } from 'react-router-dom'
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

const defaultComponent = 'MondayMorning'
const visibleComponents = Object.entries(demos).reduce<any>(
  (acc, [name, item]) => ({ ...acc, [name]: item }),
  {},
)

function Intro() {
  const match = useRouteMatch<{ name: string }>('/demo/:name')
  const { bright } = visibleComponents[match ? match.params.name : defaultComponent]
  return (
    <Page>
      <Suspense fallback={null}>
        <Switch>
          <Route exact path="/" component={visibleComponents[defaultComponent].Component} />
          <Route
            exact
            path="/demo/:name"
            render={({ match }) => {
              const Component = visibleComponents[match.params.name].Component
              return <Component />
            }}
          />
        </Switch>
      </Suspense>
      <Demos />
      <a href="https://github.com/pmndrs/use-cannon" style={{ color: bright ? '#2c2d31' : 'white' }}>
        Github
      </a>
    </Page>
  )
}

function Demos() {
  const match = useRouteMatch<{ name: string }>('/demo/:name')
  const { bright } = visibleComponents[match ? match.params.name : defaultComponent]
  return (
    <DemoPanel>
      {Object.entries(visibleComponents).map(([name]) => (
        <Link key={name} to={`/demo/${name}`}>
          <Spot
            style={{
              background:
                (!match && name === defaultComponent) || (match && match.params.name === name)
                  ? 'salmon'
                  : bright
                  ? '#2c2d31'
                  : 'white',
            }}
          />
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
