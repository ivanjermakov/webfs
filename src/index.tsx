import { Component, For, Match, Switch, createSignal, onMount } from 'solid-js'
/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'

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
        } else {
            const path = pathname.slice(1)
            const params = new URLSearchParams({ path })
            const content_ = await (await fetch(`/api/file?${params}`, {})).text()
            setFile({ path, content: content_ })
        }
    })

    const updateContent = async (newText: string) => {
        const file_ = file()
        if (!file_) return
        const params = new URLSearchParams({ path: file_.path })
        const response = await fetch(`/api/file?${params}`, { method: 'POST', body: newText })
        if (!response.ok) alert(`error writing file ${file_.path}: ${await response.text()}`)
    }

    return (
        <>
            <div class="header">
                <button type="button" onClick={() => (window.location.href = '/')}>
                    back
                </button>
                <span>{file()?.path ?? 'directory'}</span>
            </div>
            <Switch>
                <Match when={file() !== undefined}>
                    <textarea onInput={e => updateContent(e.target.value)}>{file()!.content}</textarea>
                </Match>
                <Match when={files() !== undefined}>
                    <div class="directory">
                        <For each={files()}>{file => <a href={`/${file}`}>{file}</a>}</For>
                    </div>
                </Match>
            </Switch>
        </>
    )
}

render(() => <Main />, document.getElementById('root')!)
