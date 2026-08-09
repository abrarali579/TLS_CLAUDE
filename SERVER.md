# Running the shared server

This is what lets you, your partner and your staff work on **one set of books**
instead of three separate copies.

## Starting it

On the office machine that will hold the data:

```powershell
cd D:\TLS_CLAUDE
npm install
npm start
```

`npm start` builds the app and starts the server. You'll see:

```
TimeLink server on http://0.0.0.0:4000
data folder: data

Created the three starter accounts:
  abrar@timelink.local       abrar123   (owner)
  irfan@timelink.local       irfan123   (partner)
  ayesha@timelink.local      ayesha123  (staff)

These are placeholders — change them before real use.
Keep this on your office network: there is no HTTPS.
```

Those three accounts are created the first time the server runs, and written to
`data\users.json`. Passwords are hashed with scrypt — the file never contains
the password itself.

Everyone else opens `http://<that-machine's-IP>:4000` in a browser — laptop or
phone, doesn't matter. Find the IP with `ipconfig`; it usually looks like
`192.168.1.42`.

To use a different port or database location:

```powershell
$env:TIMELINK_PORT=8080
$env:TIMELINK_DB="D:\TimeLinkData"
npm start
```

There is no database engine to install. The server keeps everything as plain
files, so there is nothing to compile and nothing that can fail to build on
Windows.

## How it decides where data goes

You don't configure this. The app works it out:

| How you opened it | Where data lives |
|---|---|
| Double-clicked `dist\TimeLink-Suite.html` | This browser only, on this machine |
| Opened `http://the-office-machine:4000` | The shared server |

At startup the app asks the server if it's there. If it answers, the shared
books are used. If not — server off, laptop at home, opened from a USB stick —
the app still works exactly as it always did, on local storage.

When you're on the shared books, a message says so shortly after loading.

## Two people editing at once

The part worth understanding.

Every save carries the revision number it started from. If your partner saved
while you were typing, the server **refuses** your save and you get:

> Someone else saved changes. Reload the page before carrying on, or your work
> may clash.

That's deliberate. The alternative — accepting it — would silently erase their
entry, and nobody would notice until the accounts didn't balance. A refused
save is annoying. A vanished invoice is expensive.

In practice, with three people on different screens, this will rarely fire.
When it does, reload and redo the last thing you typed.

## Your data, and getting it back

Everything lives in one folder:

```
data\
  timelink.json          the current books
  revisions\             every previous version
  files\                 attachments
```

**Back it up by copying that folder.** That's the whole procedure. Do it nightly
to another drive or a synced folder. UAE VAT rules require records kept five
years, so treat it the way you'd treat a filing cabinet.

You can open `timelink.json` in any text editor if you ever need to look
inside — no special tools, nothing proprietary. Writes go to a temporary file
and are renamed into place, so a power cut cannot leave you with half a file.

The server also keeps the **last 200 revisions**. Every save is a restore
point:

```
GET /api/snapshots        list them
GET /api/snapshots/42     fetch that exact version
```

So a bad import or a wrong bulk edit is recoverable, not fatal.

`data\` is gitignored. Your books never go to GitHub.

## What the server offers

| Route | Purpose |
|---|---|
| `GET /api/health` | Is the server there |
| `GET /api/data` | The whole store, with its revision |
| `PUT /api/data` | Save it back (`If-Match: <rev>`) |
| `GET /api/snapshots` | Recent restore points |
| `GET /api/snapshots/:rev` | One earlier version |
| `PUT/GET/DELETE /api/files/:id` | File attachments |
| anything else | The app itself |

## Who can see what

| | Abrar (Owner) | M Irfan (Partner) | Ayesha (Staff) |
|---|:---:|:---:|:---:|
| Data entry, invoices, payments, statements | yes | yes | yes |
| Partner shares and drawings | yes | yes | **no** |
| Restore a backup / browse earlier versions | yes | yes | no |
| Manage users | yes | no | no |

**Staff genuinely cannot see the partner figures** — this is not a hidden menu.
The server removes those rows and the profit split from the response before it
leaves the machine, so they are not in the browser at all. Hiding a screen in
the browser would only hide it from someone who doesn't know about the
developer tools.

The tricky half is what happens when Ayesha saves. She holds a copy of the
books with the partner rows missing; writing that back would delete them. So
every save from an account that cannot see those rows has them **put back from
the server's own copy first**. She can never see them, and can never destroy
them — including deliberately: a forged partner row in a save from a staff
account is ignored.

Every save also records who made it, so the Activity Log now means something.

### Change the passwords

`abrar123` and friends are placeholders. Before real data goes in, change them:

```powershell
node -e "import('./server/auth.js').then(a=>console.log(a.hashPassword('your-new-password')))"
```

Paste the result into the matching user's `password` field in
`data\users.json`, then restart the server.

### Still not for the open internet

- Traffic is **plain HTTP** — fine on your own WiFi, not over the internet
- **Do not** forward port 4000 through your router
- Anyone on your office network who has a password can sign in

Proper HTTPS and public access would need a certificate and a hardening pass.
Say the word if you ever want the app reachable from outside the office.

## If something goes wrong

**"The app has not been built yet"** — run `npm run build`.

**Others can't reach it** — Windows Firewall usually blocks the port on first
run. Allow Node through it for private networks. Check they're on the same
WiFi, and that you gave them the machine's IP rather than `localhost`.

**Everyone sees an empty app** — the server has no data yet. Open it, use
**Data & Settings → ⬆ Restore Backup** with a JSON backup from your existing
browser copy, and it becomes the shared starting point.

**The app opens but data isn't shared** — you probably opened the local file
instead of the server address. Check the URL starts with `http://`.
