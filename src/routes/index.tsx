import { id } from "@instantdb/react"
import { createFileRoute } from "@tanstack/react-router"
import { Check, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { db } from "#/lib/db"

export const Route = createFileRoute("/")({ component: Home })

function addTodo(text: string) {
  db.transact(
    db.tx.todos[id()].create({
      text,
      done: false,
      createdAt: Date.now(),
    }),
  )
}

function toggleTodo(todoId: string, done: boolean) {
  db.transact(db.tx.todos[todoId].update({ done: !done }))
}

function deleteTodo(todoId: string) {
  db.transact(db.tx.todos[todoId].delete())
}

function Home() {
  const [text, setText] = useState("")
  const { isLoading, error, data } = db.useQuery({
    todos: { $: { order: { createdAt: "desc" } } },
  })

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    addTodo(trimmed)
    setText("")
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <main className="mx-auto max-w-xl px-6 py-16">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Instant Vault</h1>
          <p className="mt-1 text-neutral-500">
            A TanStack Start + InstantDB starter. Changes sync in real time.
          </p>
        </header>

        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="What needs doing?"
            className="flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
          />
          <button
            type="button"
            onClick={submit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2.5 font-medium text-white transition hover:bg-neutral-700"
          >
            <Plus size={18} />
            Add
          </button>
        </div>

        <section className="mt-6 space-y-2">
          {isLoading && <p className="text-neutral-400">Loading…</p>}
          {error && <p className="text-red-500">Error: {error.message}</p>}
          {data?.todos.length === 0 && (
            <p className="py-8 text-center text-neutral-400">
              Nothing yet. Add your first todo above.
            </p>
          )}
          {data?.todos.map((todo) => (
            <div
              key={todo.id}
              className="group flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3"
            >
              <button
                type="button"
                onClick={() => toggleTodo(todo.id, todo.done)}
                className={`flex size-5 items-center justify-center rounded-md border transition ${
                  todo.done
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 hover:border-neutral-500"
                }`}
              >
                {todo.done && <Check size={14} />}
              </button>
              <span
                className={`flex-1 ${
                  todo.done ? "text-neutral-400 line-through" : ""
                }`}
              >
                {todo.text}
              </span>
              <button
                type="button"
                onClick={() => deleteTodo(todo.id)}
                className="text-neutral-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
