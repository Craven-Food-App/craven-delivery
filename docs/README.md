# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/44d88461-c1ea-4d22-93fe-ebc1a7d81db9

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/44d88461-c1ea-4d22-93fe-ebc1a7d81db9) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/44d88461-c1ea-4d22-93fe-ebc1a7d81db9) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Google Sheets Sync Helper

This project includes an optional Python utility (`scripts/sync_google_sheet.py`) for reading or writing data to Google Sheets. It does **not** replace the Resend-based executive document emails; it is a standalone helper you can run whenever you need sheet data.

1. **Enable the API**
   - In Google Cloud Console, enable the **Google Sheets API** (same project you already use is fine).

2. **Create a service account**
   - Generate a service account and download its JSON key.
   - Save the key next to the script as `service_account_credentials.json` (or update the path in the script).
   - Share the target spreadsheet with the service account email so it has access.

3. **Install dependencies**
   ```bash
   pip install google-auth google-auth-oauthlib google-api-python-client
   ```

4. **Configure the script**
   - Edit `SPREADSHEET_ID` and `RANGE_NAME` at the top of `scripts/sync_google_sheet.py`.
   - The script is currently set up to read rows; extend it to write data if needed.

5. **Run it**
   ```bash
   python scripts/sync_google_sheet.py
   ```

The script logs the rows it reads. Use the returned list to drive any additional processing or updates you need.