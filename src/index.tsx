/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import { Component } from 'solid-js'

const Main: Component = () => {
    return <p>hello!</p>
}

render(() => <Main />, document.getElementById('root')!)
