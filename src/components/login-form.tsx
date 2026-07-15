import { Envelope } from "@gravity-ui/icons"
import {
  Button,
  FieldError,
  Form,
  InputGroup,
  InputOTP,
  Spinner,
  TextField,
  toast,
} from "@heroui/react"
import { Link } from "@tanstack/react-router"
import { type SyntheticEvent, useEffect, useRef, useState } from "react"
import { db } from "../db/db"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="16"
      role="presentation"
      viewBox="0 0 16 16"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.877 1.46a6.921 6.921 0 0 0 .474 13.224c1.159.3 2.373.312 3.539.038a6.248 6.248 0 0 0 2.833-1.472 6.28 6.28 0 0 0 1.75-2.872 8.125 8.125 0 0 0 .176-3.673h-6.51v2.7h3.77a3.25 3.25 0 0 1-1.385 2.136c-.46.304-.98.509-1.523.601a4.517 4.517 0 0 1-1.652 0 4.068 4.068 0 0 1-1.537-.67 4.299 4.299 0 0 1-1.586-2.124 4.189 4.189 0 0 1 0-2.694c.208-.613.551-1.17 1.005-1.631a4.066 4.066 0 0 1 4.096-1.07c.558.172 1.07.471 1.492.875.425-.423.849-.847 1.273-1.272.218-.228.457-.446.672-.68a6.693 6.693 0 0 0-2.227-1.374 7 7 0 0 0-4.66-.042Z"
        fill="#fff"
      ></path>
      <path
        d="M5.877 1.46a7 7 0 0 1 4.66.04c.826.31 1.582.78 2.226 1.381-.219.234-.45.453-.672.68l-1.272 1.267a3.752 3.752 0 0 0-1.492-.875 4.066 4.066 0 0 0-4.098 1.065A4.293 4.293 0 0 0 4.225 6.65L1.958 4.894A6.949 6.949 0 0 1 5.877 1.46Z"
        fill="#E33629"
      ></path>
      <path
        d="M1.356 6.633a6.89 6.89 0 0 1 .602-1.74l2.267 1.76a4.19 4.19 0 0 0 0 2.694c-.755.584-1.511 1.17-2.267 1.76a6.927 6.927 0 0 1-.602-4.474Z"
        fill="#F8BD00"
      ></path>
      <path
        d="M8.139 6.704h6.51a8.127 8.127 0 0 1-.176 3.673 6.283 6.283 0 0 1-1.75 2.872c-.732-.571-1.467-1.138-2.199-1.709a3.25 3.25 0 0 0 1.385-2.137h-3.77v-2.7Z"
        fill="#587DBD"
      ></path>
      <path
        d="M1.957 11.106a539.69 539.69 0 0 0 2.267-1.759 4.298 4.298 0 0 0 1.588 2.125c.462.326.987.552 1.54.665a4.517 4.517 0 0 0 1.652 0 3.96 3.96 0 0 0 1.524-.602c.731.57 1.466 1.137 2.198 1.708a6.25 6.25 0 0 1-2.833 1.474 7.394 7.394 0 0 1-3.54-.039 6.967 6.967 0 0 1-4.397-3.572Z"
        fill="#319F43"
      ></path>
    </svg>
  )
}

export function LoginForm() {
  const [sentEmail, setSentEmail] = useState("")

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 items-center justify-center px-2 md:px-4">
      <div className="flex w-full flex-col gap-6">
        {!sentEmail ? (
          <EmailStep onSendEmail={setSentEmail} />
        ) : (
          <CodeStep sentEmail={sentEmail} setSentEmail={setSentEmail} />
        )}
      </div>
    </main>
  )
}

function EmailStep({ onSendEmail }: { onSendEmail: (email: string) => void }) {
  const onSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    const email = e.currentTarget.email.value as string

    db.auth
      .sendMagicCode({ email })
      .then(() => onSendEmail(email))
      .catch((error) => {
        toast.danger(error.body?.message)
        onSendEmail("")
      })
  }

  return (
    <>
      <div className="text-center">
        <h1 className="mb-2 text-xl font-semibold">Welcome to InstantVault!</h1>

        <p className="text-muted text-wrap px-1 text-sm">
          Log in or sign up for an account
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Form key="email" onSubmit={onSubmit} className="flex flex-col gap-3">
          <TextField
            fullWidth
            isRequired
            name="email"
            type="email"
            autoComplete="email"
            aria-label="Email address"
            autoFocus
          >
            <InputGroup>
              <InputGroup.Prefix>
                <Envelope />
              </InputGroup.Prefix>

              <InputGroup.Input placeholder="Email address" />
            </InputGroup>

            <FieldError />
          </TextField>

          <Button fullWidth type="submit">
            Continue
          </Button>
        </Form>

        <div className="flex items-center gap-3">
          <div className="bg-separator h-px flex-1"></div>
          <span className="text-muted text-xs font-medium uppercase">or</span>
          <div className="bg-separator h-px flex-1"></div>
        </div>

        {/* Google Button */}
        <Button fullWidth variant="tertiary">
          <GoogleIcon />
          Continue with Google
        </Button>
      </div>

      <div className="text-muted text-center text-xs">
        By continuing, you agree to our{" "}
        <Link className="link underline-offset-2 text-xs!" to="/terms">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link className="link underline-offset-2 text-xs!" to="/privacy">
          Privacy Policy
        </Link>
      </div>
    </>
  )
}

function CodeStep({
  sentEmail,
  setSentEmail,
}: {
  sentEmail: string
  setSentEmail: (email: string) => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (code.length !== 6) {
      setError("Please enter all 6 digits")
      return
    }

    setError("")
    setIsPending(true)

    db.auth
      .signInWithMagicCode({
        email: sentEmail,
        code,
        extraFields: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .catch((error) => {
        setCode("")
        formRef.current?.reset()
        toast.danger(error.body?.message)
      })
      .finally(() => setIsPending(false))
  }

  useEffect(() => {
    if (code.length === 6) {
      formRef.current?.requestSubmit()
    }
  }, [code])

  return (
    <>
      <div className="text-center">
        <h1 className="mb-2 text-xl font-semibold">Welcome to InstantVault!</h1>

        <p className="text-muted text-wrap px-1 text-sm">
          Log in or sign up for an account
        </p>
      </div>

      <Form
        key="code"
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <p className="text-muted text-center text-sm">
          Enter the code sent to{" "}
          <strong className="text-foreground">{sentEmail}</strong>
        </p>

        <InputOTP
          className="mx-auto"
          isInvalid={!!error}
          maxLength={6}
          value={code}
          onChange={(value) => {
            setCode(value)
            setError("")
          }}
        >
          <InputOTP.Group>
            <InputOTP.Slot index={0} className="rounded-2xl" />
            <InputOTP.Slot index={1} className="rounded-2xl" />
            <InputOTP.Slot index={2} className="rounded-2xl" />
          </InputOTP.Group>

          <InputOTP.Separator />

          <InputOTP.Group>
            <InputOTP.Slot index={3} className="rounded-2xl" />
            <InputOTP.Slot index={4} className="rounded-2xl" />
            <InputOTP.Slot index={5} className="rounded-2xl" />
          </InputOTP.Group>
        </InputOTP>

        <span
          className="field-error text-center"
          data-visible={!!error}
          id="code-error"
        >
          {error}
        </span>

        <Button fullWidth type="submit" isPending={isPending}>
          {isPending && <Spinner color="current" size="sm" />}
          Verify
        </Button>
      </Form>

      <div className="flex gap-3 justify-center">
        <button
          className="text-muted text-xs! link underline underline-offset-2"
          type="button"
          onClick={() => {
            db.auth
              .sendMagicCode({ email: sentEmail })
              .then(() => {
                toast("Code resent")
              })
              .catch((error) => {
                toast.danger(error.body?.message)
              })
          }}
        >
          Resend code
        </button>

        <button
          className="text-muted text-xs! link underline underline-offset-2"
          type="button"
          onClick={() => setSentEmail("")}
        >
          Use a different email
        </button>
      </div>
    </>
  )
}
