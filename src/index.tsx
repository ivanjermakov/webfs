/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import { Component, createSignal, For, Match, onMount, Switch } from 'solid-js'

type File = {
    path: string
    content: string
}

const Main: Component = () => {
    const [files, setFiles] = createSignal<string[] | undefined>()
    const [file, setFile] = createSignal<File | undefined>()
    onMount(async () => {
        const pathname = location.pathname
        if (pathname === '/' || pathname === '/index.html') {
            const files_ = await (await fetch('/api/files')).json()
            setFiles(files_)
            console.log(files_)
        } else {
            const path = pathname.slice(1)
            const params = new URLSearchParams({ path });
            const content_ = await (await fetch(`/api/file?${params}`, {})).text()
            setFile({ path, content: content_ })
            console.log(file())
        }
    })
    return <>
        <div class="header">{file()?.path ?? 'directory'}</div>
        <Switch>
            <Match when={file() !== undefined}>
                <textarea>{file()!.content}</textarea>
            </Match>
            <Match when={files() !== undefined}>
                <div class="directory">
                    <For each={files()}>{file => <a href={`/${file}`}>{file}</a>}</For>
                </div>
            </Match>
        </Switch>
    </>
}

render(() => <Main />, document.getElementById('root')!)
