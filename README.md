# Smart Spend Analyzer

Simple frontend app built with HTML, CSS, JavaScript, and Bootstrap.

## Features

- Add expenses with fields: date, description, category, amount (INR)
- See total expense amount, total entries, and top category
- View and delete expense entries
- Data persists in browser localStorage
- Login and signup pages are available
- Any user can open `dashboard.html` and add expenses

## Project Structure

- `/Users/muraliveesambattu/Documents/smart_spend_analyze/dashboard.html` (expense dashboard)
- `/Users/muraliveesambattu/Documents/smart_spend_analyze/index.html` (login page)
- `/Users/muraliveesambattu/Documents/smart_spend_analyze/signup.html` (signup page)

## Run

Open `/Users/muraliveesambattu/Documents/smart_spend_analyze/index.html` in a browser.

For local static serving:

```bash
cd /Users/muraliveesambattu/Documents/smart_spend_analyze
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.
