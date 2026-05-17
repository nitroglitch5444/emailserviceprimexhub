# API & Extraction Functions Explained

Welcome to the internal documentation for the email extraction and API endpoints.

## 1. Webhook Extraction (`POST /api/webhook/email`)
The webhook listens for incoming emails and has an automatic parser. Based on the domain of the sender, the system uses two different detection modes:

### A. Magic Link Extraction (For `*.rscripts.net`)
If the `"from"` address of the received email ends with `.rscripts.net` (e.g., `noreply+2deacd30-...@bounce-zem.rscripts.net`), the system skips looking for a numerical OTP. Instead, it:
1. Searches the HTML/Text body for the Magic Link sign-in URL formatting.
2. Extracts any URL that matches the pattern `https://rscripts.net/api/auth/magic-link/verify?token=...`.
3. Cleans up HTML formatting issues (e.g., converting `&amp;` to `&`).
4. Saves this full URL into the database's `otp` field.

### B. Standard Numeric Extraction (For typical domains)
For all other domains, the system uses an intelligent Regex to find numbers between 4 and 8 digits long that are positioned close to trigger words like `otp`, `code`, `pin`, `password`, `verification`, or `token`. 
* It ignores years (e.g., `19xx`, `20xx`) to prevent accidental date extraction.
* The extracted numeric code is stored cleanly in the `otp` field.

---

## 2. Live API Access (`GET /api/live-otp/latest`)
When your user frontend or polling clients call the Live OTP endpoint, the system automatically checks the format of the `otp` variable stored in the database.

* **Response Format details:**
  Instead of sending raw URLs that could break your UI, the API processes the result on the fly. 
  * If the database string starts with `http` (which indicates a Magic Link was recorded), the JSON response modifies the output.
  * In the output:
    * `otp`: Replaced with `"Click Link"` -> For easy UI rendering (it will say "Click Link" visually where "4312" would normally be).
    * `link`: Contains the *actual URL extracted* -> So your application can embed it as a clickable `href` or copy button.
    * For normal OTPs, `link` is simply `null`, and `otp` contains the original digits.

## 3. How to authenticate an API Call

By default, hitting the endpoints via outside tools (like Postman or a Python script) will return an `Access denied` error.
You need the Bearer Token to access the routes. 

### How to get your API Token:
1. Log into your dashboard via your browser.
2. Press **F12** to open the Developer Tools.
3. Go to the **Application** tab (or **Storage** tab on Firefox).
4. Under "Local Storage", select your website URL.
5. Look for the Key named **`token`**.
6. Copy the entire Value string (it usually starts with `eyJ...`).

### How to send the Token in your API Request:

**Example using cURL:**
```bash
curl -X GET "https://ais-pre-....run.app/api/live-otp/latest" \
     -H "Authorization: Bearer YOUR_COPIED_TOKEN_HERE"
```

**Example using Python (Requests):**
```python
import requests

url = "https://ais-pre-....run.app/api/live-otp/latest"
headers = {
    "Authorization": "Bearer YOUR_COPIED_TOKEN_HERE"
}

response = requests.get(url, headers=headers)
print(response.json())
```
