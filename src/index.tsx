import { parse } from 'marked'
/* @refresh reload */
import { Component, For, Match, Show, Switch, createResource, createSignal, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import './index.css'

type File = {
    path: string
    content: string
}

type Mode = 'txt' | 'md'

const Main: Component = () => {
    const [files, setFiles] = createSignal<string[] | undefined>()
    const [file, setFile] = createSignal<File | undefined>()
    const [mode, setMode] = createSignal<Mode>('txt')

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

    const [renderedMd] = createResource(file, async file_ => {
        const content = file_?.content
        if (content === undefined) return undefined
        // TODO: repair <img> urls
        const html = await parse(content)
        console.log(html)
        return html
    })

    return (
        <>
            <Switch>
                <Match when={file() !== undefined}>
                    <div class="header">
                        <button type="button" onClick={() => (window.location.href = '/')}>
                            back
                        </button>
                        <span>{file()!.path}</span>
                        <div class="section" style={{ 'margin-left': 'auto' }}>
                            <button
                                type="button"
                                classList={{ active: mode() === 'txt' }}
                                onClick={() => setMode('txt')}
                            >
                                txt
                            </button>
                            <Show when={file()!.path.endsWith('.md')}>
                                <button
                                    type="button"
                                    classList={{ active: mode() === 'md' }}
                                    onClick={() => setMode('md')}
                                >
                                    md
                                </button>
                            </Show>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const params = new URLSearchParams({ path: file()!.path })
                                window.open(`/api/file?${params}`)
                            }}
                        >
                            raw
                        </button>
                    </div>
                    <Switch>
                        <Match when={mode() === 'txt'}>
                            <textarea onInput={e => updateContent(e.target.value)}>{file()!.content}</textarea>
                        </Match>
                        <Match when={mode() === 'md'}>
                            <div class="rendered" innerHTML={renderedMd()} />
                        </Match>
                    </Switch>
                </Match>
                <Match when={files() !== undefined}>
                    <div class="header">
                        <span>directory</span>
                    </div>
                    <div class="directory">
                        <For each={files()}>{file => <a href={`/${file}`}>{file}</a>}</For>
                    </div>
                </Match>
            </Switch>
        </>
    )
}

render(() => <Main />, document.getElementById('root')!)
