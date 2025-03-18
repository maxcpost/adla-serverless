import { OpenAI } from 'openai';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Get property data from request body
    const { propertyData } = req.body;
    
    if (!propertyData) {
      return res.status(400).json({ error: 'Property data is required' });
    }
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Format the property data into a concise summary
    const propertySummary = `
    Property Stock #: ${propertyData.StockNumber}
    Location: ${propertyData.County || 'N/A'} County, ${propertyData.State || 'N/A'}
    Price: ${propertyData['For Sale Price'] ? '$' + numberWithCommas(propertyData['For Sale Price']) : 'Not priced'}
    Acres: ${propertyData['Land Area (AC)'] ? formatNumber(propertyData['Land Area (AC)'], 2) : 'N/A'}
    Price Per Acre: ${propertyData['Price Per Acre'] ? '$' + numberWithCommas(propertyData['Price Per Acre']) : 'N/A'}
    Composite Score: ${propertyData['Composite Score'] ? formatNumber(propertyData['Composite Score'], 1) : 'N/A'}/100
    Demand for Attainable Rent: ${propertyData['Demand for Attainable Rent'] ? formatNumber(propertyData['Demand for Attainable Rent'], 1) : 'N/A'}
    Housing Gap: ${propertyData['Housing Gap'] ? formatNumber(propertyData['Housing Gap'], 1) : 'N/A'}
    Home Affordability Gap: ${propertyData['Home Affordability Gap'] ? formatNumber(propertyData['Home Affordability Gap'], 1) : 'N/A'}
    Weighted Demand and Convenience: ${propertyData['Weighted Demand and Convenience'] ? formatNumber(propertyData['Weighted Demand and Convenience'], 1) : 'N/A'}
    Walmart Distance: ${propertyData['Walmart Distance (mi)'] ? formatNumber(propertyData['Walmart Distance (mi)'], 1) + ' miles' : 'N/A'}
    Population: ${propertyData['Population'] ? numberWithCommas(propertyData['Population']) : 'N/A'}
    Median Income: ${propertyData['Median Income'] ? '$' + numberWithCommas(propertyData['Median Income']) : 'N/A'}
    Median Home Value: ${propertyData['Median Home Value'] ? '$' + numberWithCommas(propertyData['Median Home Value']) : 'N/A'}
    Population Growth: ${propertyData['Population Growth'] ? formatNumber(propertyData['Population Growth'], 1) + '%' : 'N/A'}
    `;
    
    // Generate AI report
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // You can use "gpt-4" for higher quality
      messages: [
        {
          role: "system",
          content: "You are an expert land investment analyst. Create a professional investment analysis report about a property based on its data metrics. Format your response in HTML for display on a website. Include sections for Overview, Investment Potential, Market Analysis, and Recommendations. Use detailed analysis and professional language. Make sure the HTML is valid and includes appropriate Bootstrap 5 styling classes for a professional appearance."
        },
        {
          role: "user",
          content: `Generate an investment analysis report for this property: ${propertySummary}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1200
    });
    
    // Return the generated report
    return res.status(200).json({
      report: completion.choices[0].message.content
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return res.status(500).json({
      error: 'Failed to generate report',
      message: error.message
    });
  }
}

// Helper function to format numbers with commas
function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Helper function to format numbers with specified decimal places
function formatNumber(num, decimals) {
  return Number(num).toFixed(decimals);
} 