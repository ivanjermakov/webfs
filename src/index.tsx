/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import { Component, createSignal, For, Match, onMount, Switch } from 'solid-js'

const Main: Component = () => {
    const [files, setFiles] = createSignal<string[] | undefined>()
    const [content, setContent] = createSignal<string | undefined>()
    onMount(async () => {
        const path = location.pathname
        if (path === '/' || path === '/index.html') {
            const files_ = await (await fetch('/api/files')).json()
            setFiles(files_)
            console.log(files_)
        } else {
            const params = new URLSearchParams({ path: path.slice(1) });
            const content_ = await (await fetch(`/api/file?${params}`, {})).text()
            setContent(content_)
            console.log(content_)
        }
    })
    return <Switch>
        <Match when={content() !== undefined}>
            <textarea>{content()}</textarea>
        </Match>
        <Match when={files() !== undefined}>
            <div class="directory">
                <For each={files()}>{file => <a href={`/${file}`}>{file}</a>}</For>
            </div>
        </Match>
    </Switch>
}

render(() => <Main />, document.getElementById('root')!)
