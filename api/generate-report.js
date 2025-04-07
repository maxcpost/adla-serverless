import OpenAI from 'openai';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  // Allow requests from specific origins
  const allowedOrigins = [
    'https://agoratree.xyz',
    'https://www.agoratree.xyz',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5500'
  ];
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
  res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Origin');
  
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
    
    console.log('Report generation request received');
    
    // Get property data from request body
    const { propertyData } = req.body;
    
    if (!propertyData) {
      console.log('Missing property data in request');
      return res.status(400).json({ error: 'Property data is required' });
    }
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('Missing OpenAI API key in environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error', 
        message: 'OpenAI API key is not configured'
      });
    }
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Format the property data for AI analysis
    const formattedData = formatPropertyDataForAI(propertyData);
    
    // Get any user-provided narrative
    const userNarrative = propertyData.userNarrative || '';
    
    // Create the prompt for the AI
    const prompt = createAIPrompt(formattedData, userNarrative);
    
    console.log('Sending request to OpenAI...');
    
    // Generate AI report
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are a real estate and community development strategist evaluating land parcels for NVDG (New Village Development Group) — a mission-driven organization focused on building intentional, affordable, and resilient communities across the U.S.

NVDG's core goals include:
- Building sustainable, intergenerational neighborhoods that foster connection, belonging, and wellness
- Prioritizing homeownership opportunities for underserved and working-class populations
- Choosing locations with strong population growth, economic stability, and long-term affordability
- Ensuring accessibility to key amenities like grocery stores, healthcare, schools, parks, and transit
- Avoiding environmental and climate risks (e.g., flood zones, high vacancy, poor infrastructure)

Your job is to critically evaluate the potential of this land for NVDG's community development goals and respond with the following:
1. Overall Suitability: Rate as High / Medium / Low
2. Key Strengths & Opportunities: Highlight the most promising indicators for community development, with SPECIAL ATTENTION to advantageous zoning (such as PUD, mixed-use, master planned, high-density residential) that could enable NVDG's mission
3. Critical Risks & Red Flags: Thoroughly identify ALL potential concerns that could limit success or increase costs, with DETAILED ANALYSIS of any flood risks, environmental hazards, or zoning restrictions
4. Strategic Fit for NVDG: How well this parcel aligns with NVDG's mission and model
5. Recommendations: Suggest any due diligence, further research, or next steps, PRIORITIZING the most critical actions based on identified risks and opportunities

Be clear, objective, and mission-aligned in your evaluation. Focus on long-term potential, equity, and livability. Format the report as plain text with section headers in ALL CAPS.

IMPORTANT: Flag any high-risk factors prominently (especially flood zones or environmental hazards) and emphasize any exceptional opportunities (especially favorable zoning or development potential).`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });
    
    console.log('Received response from OpenAI');
    
    // Return the generated report
    return res.status(200).json({
      report: completion.choices[0].message.content,
      usage: completion.usage
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return res.status(500).json({
      error: 'Failed to generate report',
      message: error.message
    });
  }
}

/**
 * Formats property data to highlight the most important metrics for AI analysis
 * @param {Object} data - The complete property data object
 * @returns {Object} - Formatted data object with key metrics highlighted
 */
function formatPropertyDataForAI(data) {
  // Copy the data to avoid mutations
  const formatted = { ...data };
  
  // Add computed metrics that might be useful for analysis
  formatted.formattedPrice = data.For_Sale_Price ? '$' + numberWithCommas(data.For_Sale_Price) : 'N/A';
  
  if (data.For_Sale_Price && data.Land_Area_AC) {
    const pricePerAcre = data.For_Sale_Price / data.Land_Area_AC;
    formatted.pricePerAcre = '$' + numberWithCommas(Math.round(pricePerAcre));
  } else {
    formatted.pricePerAcre = 'N/A';
  }
  
  // Format percentiles for readability
  if (data.Home_Affordability_Percentile) {
    formatted.Home_Affordability_Percentile_Formatted = formatPercentile(data.Home_Affordability_Percentile);
  }
  
  if (data.Rent_Affordability_Percentile) {
    formatted.Rent_Affordability_Percentile_Formatted = formatPercentile(data.Rent_Affordability_Percentile);
  }
  
  if (data.Convenience_Index_Percentile) {
    formatted.Convenience_Index_Percentile_Formatted = formatPercentile(data.Convenience_Index_Percentile);
  }
  
  if (data.Population_Access_Percentile) {
    formatted.Population_Access_Percentile_Formatted = formatPercentile(data.Population_Access_Percentile);
  }
  
  if (data.Market_Saturation_Percentile) {
    formatted.Market_Saturation_Percentile_Formatted = formatPercentile(data.Market_Saturation_Percentile);
  }
  
  if (data.Composite_Score_Percentile) {
    formatted.Composite_Score_Percentile_Formatted = formatPercentile(data.Composite_Score_Percentile);
  }
  
  // Calculate population growth trends
  if (data['%_Pop_Grwth_2020-2024(5m)'] && data['%_Pop_Grwth_2024-2029(5m)']) {
    const current = parseFloat(data['%_Pop_Grwth_2020-2024(5m)']);
    const future = parseFloat(data['%_Pop_Grwth_2024-2029(5m)']);
    
    if (!isNaN(current) && !isNaN(future)) {
      formatted.popGrowthTrend5m = future > current ? 'increasing' : 
                                 future < current ? 'decreasing' : 'stable';
      formatted.popGrowthTrendMessage5m = `Population growth within 5 miles is ${formatted.popGrowthTrend5m} (${formatNumber(current, 2)}% to ${formatNumber(future, 2)}%)`;
    }
  }
  
  if (data['%_Pop_Grwth_2020-2024(10m)'] && data['%_Pop_Grwth_2024-2029(10m)']) {
    const current = parseFloat(data['%_Pop_Grwth_2020-2024(10m)']);
    const future = parseFloat(data['%_Pop_Grwth_2024-2029(10m)']);
    
    if (!isNaN(current) && !isNaN(future)) {
      formatted.popGrowthTrend10m = future > current ? 'increasing' : 
                                  future < current ? 'decreasing' : 'stable';
      formatted.popGrowthTrendMessage10m = `Population growth within 10 miles is ${formatted.popGrowthTrend10m} (${formatNumber(current, 2)}% to ${formatNumber(future, 2)}%)`;
    }
  }
  
  return formatted;
}

/**
 * Creates a comprehensive AI prompt based on formatted property data
 * @param {Object} data - Formatted property data
 * @param {string} userNarrative - User-provided narrative or notes
 * @returns {string} - Complete prompt for the AI
 */
function createAIPrompt(data, userNarrative) {
  return `
I need you to evaluate the following property for NVDG's community development goals:

Property Details:
- Address: ${data.Property_Address || 'N/A'}, ${data.City || 'N/A'}, ${data.State || 'N/A'} ${data.Zip || 'N/A'}
- County: ${data.County_Name || 'N/A'}
- Acres: ${data.Land_Area_AC || 'N/A'}
- Price: $${formatNumber(data.For_Sale_Price || 0)}
- Zoning: ${data.Zoning || 'N/A'}
- Proposed Use: ${data.Proposed_Land_Use || 'N/A'}

Demographics (5-mile radius):
- Population: ${formatNumber(data.TotPop_5 || 0)}
- Population Growth (2020-2024): ${data['%_Pop_Grwth_2020-2024(5m)'] || 'N/A'}%
- Median Household Income: $${formatNumber(data.MedianHHInc_5 || 0)}
- Median Home Value: $${formatNumber(data.MedianHValue_5 || 0)}
- Median Rent: $${formatNumber(data.MedianGrossRent_5 || 0)}

Environment & Risk:
- Flood Zone: ${data.Fema_Flood_Zone || 'N/A'}
- In Special Flood Hazard Area: ${data.In_SFHA || 'N/A'}

Accessibility:
- Nearest Walmart: ${data.Nearest_Walmart_Distance_Miles || 'N/A'} miles
- Nearest Hospital: ${data.Nearest_Hospital_Distance_Miles || 'N/A'} miles
- Nearest Park: ${data.Nearest_Park_Distance_Miles || 'N/A'} miles

Rankings:
- Home Unaffordability: ${data.Home_Affordability_Percentile_Formatted || 'N/A'} percentile
- Rent Unaffordability: ${data.Rent_Affordability_Percentile_Formatted || 'N/A'} percentile
- Convenience Index: ${data.Convenience_Index_Percentile_Formatted || 'N/A'} percentile
- Population Access: ${data.Population_Access_Percentile_Formatted || 'N/A'} percentile
- Market Saturation: ${data.Market_Saturation_Percentile_Formatted || 'N/A'} percentile
- Composite Score: ${data.Composite_Score_Percentile_Formatted || 'N/A'} percentile

${userNarrative ? `Additional context from user: ${userNarrative}` : ''}

Based on this data, provide a comprehensive evaluation for NVDG's mission of building intentional, affordable and resilient communities.
`;
}

/**
 * Format a number with commas for thousands
 * @param {number} num - The number to format
 * @returns {string} - Formatted number
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Format a percentile value for display
 * @param {string|number} value - The percentile value
 * @returns {string} Formatted percentile
 */
function formatPercentile(value) {
  if (!value) return 'N/A';
  
  // Remove any non-numeric characters
  const cleanedValue = value.toString().replace(/[^\d.]/g, '');
  const numValue = parseFloat(cleanedValue);
  
  if (isNaN(numValue)) return 'N/A';
  
  return formatNumber(numValue, 0);
}

/**
 * Format a number with commas for thousands separators
 * @param {number|string} x - Number to format
 * @returns {string} Formatted number with commas
 */
function numberWithCommas(x) {
  if (!x) return 'N/A';
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
} 