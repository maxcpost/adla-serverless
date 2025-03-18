# ADLA AI Report Generator

This is a serverless function that generates AI-powered investment analysis reports for properties in the Automated Data-Led Land Analysis (ADLA) system.

## Setup Instructions

### Prerequisites
- GitHub account
- Vercel account (sign up at [vercel.com](https://vercel.com))
- OpenAI API key (sign up at [openai.com](https://openai.com))

### Deployment Steps

1. **Create a GitHub repository**:
   - Create a new repository on GitHub
   - Push this code to your new repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/adla-serverless.git
   git push -u origin main
   ```

2. **Connect Vercel to GitHub**:
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New..." > "Project"
   - Import your GitHub repository
   - Keep all default settings, but add the environment variable:
     - Name: `OPENAI_API_KEY`
     - Value: Your OpenAI API key
   - Click "Deploy"

3. **Get your function URL**:
   - After deployment, Vercel will provide a URL
   - Your function will be available at: `https://your-project-name.vercel.app/api/generate-report`

## Usage

The function accepts POST requests with a JSON body containing property data:

```javascript
fetch('https://your-project-name.vercel.app/api/generate-report', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    propertyData: {
      // Property data object
    }
  })
})
.then(response => response.json())
.then(data => {
  // data.report contains the HTML report
})
```

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Security Notes

- Keep your OpenAI API key secure
- Consider implementing rate limiting and authentication for production use
- The current CORS policy allows requests from any origin (`*`) 