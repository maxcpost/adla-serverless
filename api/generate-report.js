import { OpenAI } from 'openai';

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
      model: "gpt-4", // Use most reliable model
      messages: [
        {
          role: "system",
          content: "You are an expert land investment analyst. You're assisting a professional land analyst by providing detailed insights based on comprehensive demographic, economic, and geographic data. Create a professional investment analysis report about a property based on its data metrics. Format your response in HTML for display on a website. Include sections for:\n\n1. Executive Summary\n2. Location Analysis\n3. Market Dynamics\n4. Population & Demographics\n5. Income & Housing Affordability\n6. Development Potential\n7. Risk Assessment\n8. Investment Recommendations\n\nUse detailed analysis and professional language. Make sure the HTML is valid and includes appropriate Bootstrap 5 styling classes for a professional appearance."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5, // More focused output
      max_tokens: 2500  // Increased for more detailed analysis
    });
    
    console.log('Received response from OpenAI');
    
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
Please analyze this property for potential land development:

PROPERTY DETAILS:
- Stock Number: ${data.StockNumber || 'N/A'}
- Address: ${data.Property_Address || 'N/A'}, ${data.City || 'N/A'}, ${data.State || 'N/A'} ${data.Zip || 'N/A'}
- County: ${data.County_Name || 'N/A'}
- Price: ${data.formattedPrice || 'N/A'}
- Land Area: ${data.Land_Area_AC ? formatNumber(data.Land_Area_AC, 2) + ' acres' : 'N/A'}
- Price Per Acre: ${data.pricePerAcre || 'N/A'}
- Zoning: ${data.Zoning || 'N/A'}
- Proposed Use: ${data.Proposed_Land_Use || 'N/A'}
- Last Sale Date: ${data.Last_Sale_Date || 'N/A'}
- Last Sale Price: ${data.Last_Sale_Price || 'N/A'}

FLOOD INFORMATION:
- In Special Flood Hazard Area: ${data.In_SFHA || 'N/A'}
- FEMA Flood Zone: ${data.Fema_Flood_Zone || 'N/A'}
- FEMA Map Date: ${data.FEMA_Map_Date || 'N/A'}
- Floodplain Area: ${data.Floodplain_Area || 'N/A'}

POPULATION GROWTH:
- 5-mile radius (2020-2024): ${data['%_Pop_Grwth_2020-2024(5m)'] ? formatNumber(data['%_Pop_Grwth_2020-2024(5m)'], 2) + '%' : 'N/A'}
- 5-mile radius (2024-2029): ${data['%_Pop_Grwth_2024-2029(5m)'] ? formatNumber(data['%_Pop_Grwth_2024-2029(5m)'], 2) + '%' : 'N/A'}
- 10-mile radius (2020-2024): ${data['%_Pop_Grwth_2020-2024(10m)'] ? formatNumber(data['%_Pop_Grwth_2020-2024(10m)'], 2) + '%' : 'N/A'}
- 10-mile radius (2024-2029): ${data['%_Pop_Grwth_2024-2029(10m)'] ? formatNumber(data['%_Pop_Grwth_2024-2029(10m)'], 2) + '%' : 'N/A'}
${data.popGrowthTrendMessage5m ? '- ' + data.popGrowthTrendMessage5m : ''}
${data.popGrowthTrendMessage10m ? '- ' + data.popGrowthTrendMessage10m : ''}

POPULATION SUMMARY:
- 5-mile radius: ${data.TotPop_5 ? numberWithCommas(data.TotPop_5) : 'N/A'}
- 10-mile radius: ${data.TotPop_10 ? numberWithCommas(data.TotPop_10) : 'N/A'}
- 15-mile radius: ${data.TotPop_15 ? numberWithCommas(data.TotPop_15) : 'N/A'}
- 20-mile radius: ${data.TotPop_20 ? numberWithCommas(data.TotPop_20) : 'N/A'}
- 25-mile radius: ${data.TotPop_25 ? numberWithCommas(data.TotPop_25) : 'N/A'}

HOUSEHOLD INCOME (5-mile radius):
- Median Household Income: ${data.MedianHHInc_5 ? '$' + numberWithCommas(data.MedianHHInc_5) : 'N/A'}
- Average Household Income: ${data.AvgHHInc_5 ? '$' + numberWithCommas(data.AvgHHInc_5) : 'N/A'}
- Low Income Households (< $35k): ${calculateIncomeBracket(data, '5', 0, 35)}%
- Middle Income Households ($35k-$100k): ${calculateIncomeBracket(data, '5', 35, 100)}%
- High Income Households (> $100k): ${calculateIncomeBracket(data, '5', 100, Infinity)}%

HOUSING MARKET (5-mile radius):
- Total Housing Units: ${data.TotHUs_5 ? numberWithCommas(data.TotHUs_5) : 'N/A'}
- Owner Occupied: ${data.OwnerOcc_5 ? numberWithCommas(data.OwnerOcc_5) + ' (' + calculatePercentage(data.OwnerOcc_5, data.OccHUs_5) + '%)' : 'N/A'}
- Renter Occupied: ${data.RenterOcc_5 ? numberWithCommas(data.RenterOcc_5) + ' (' + calculatePercentage(data.RenterOcc_5, data.OccHUs_5) + '%)' : 'N/A'}
- Vacant Units: ${data.VacHUs_5 ? numberWithCommas(data.VacHUs_5) + ' (' + calculatePercentage(data.VacHUs_5, data.TotHUs_5) + '%)' : 'N/A'}
- Median Home Value: ${data.MedianHValue_5 ? '$' + numberWithCommas(data.MedianHValue_5) : 'N/A'}
- Median Gross Rent: ${data.MedianGrossRent_5 ? '$' + numberWithCommas(data.MedianGrossRent_5) : 'N/A'}
- Average Gross Rent: ${data.AvgGrossRent_5 ? '$' + numberWithCommas(data.AvgGrossRent_5) : 'N/A'}

NEARBY AMENITIES:
- Nearest Walmart: ${data.Nearest_Walmart_Distance_Miles ? formatNumber(data.Nearest_Walmart_Distance_Miles, 1) + ' miles (' + data.Nearest_Walmart_Travel_Time_Minutes + ' min travel time)' : 'N/A'}
- Nearest Hospital: ${data.Nearest_Hospital_Distance_Miles ? formatNumber(data.Nearest_Hospital_Distance_Miles, 1) + ' miles (' + data.Nearest_Hospital_Travel_Time_Minutes + ' min travel time)' : 'N/A'}
- Nearest Park: ${data.Nearest_Park_Distance_Miles ? formatNumber(data.Nearest_Park_Distance_Miles, 1) + ' miles (' + data.Nearest_Park_Travel_Time_Minutes + ' min travel time)' : 'N/A'}

AFFORDABILITY & MARKET INDICES:
- Home Affordability: ${data.Home_Affordability_Percentile_Formatted || 'N/A'} percentile
- Rent Affordability: ${data.Rent_Affordability_Percentile_Formatted || 'N/A'} percentile
- Convenience Index: ${data.Convenience_Index_Percentile_Formatted || 'N/A'} percentile
- Population Access: ${data.Population_Access_Percentile_Formatted || 'N/A'} percentile
- Market Saturation: ${data.Market_Saturation_Percentile_Formatted || 'N/A'} percentile
- Composite Score: ${data.Composite_Score_Percentile_Formatted || 'N/A'} percentile

ANALYST NOTES:
${userNarrative || "No additional notes provided by the analyst."}

Based on this data, please provide:
1. A comprehensive analysis of this property's development potential
2. Key strengths and challenges of this location
3. Market opportunities based on demographics and population trends
4. Recommendations for optimal development approaches
5. Risk assessment and mitigation strategies
6. Investment outlook (short-term and long-term)

Format the report in sections with clear headings and bullet points where appropriate.
Include HTML tags to structure the report for web display with Bootstrap 5 classes.
`;
}

/**
 * Calculates the percentage of households within a specific income bracket
 * @param {Object} data - Property data object
 * @param {string} radius - Radius to use (e.g., '5', '10')
 * @param {number} min - Minimum income (in thousands)
 * @param {number} max - Maximum income (in thousands, use Infinity for no upper limit)
 * @returns {string} Formatted percentage
 */
function calculateIncomeBracket(data, radius, min, max) {
  try {
    let total = 0;
    let inBracket = 0;
    
    // Get total households
    const totalHHKey = `TotHHs_${radius}`;
    total = parseInt(data[totalHHKey]) || 0;
    
    if (total === 0) return 'N/A';
    
    // Income bracket keys based on radius
    const brackets = [
      { key: `HHInc0_${radius}`, max: 10 },
      { key: `HHInc10_${radius}`, min: 10, max: 15 },
      { key: `HHInc15_${radius}`, min: 15, max: 25 },
      { key: `HHInc25_${radius}`, min: 25, max: 35 },
      { key: `HHInc35_${radius}`, min: 35, max: 50 },
      { key: `HHInc50_${radius}`, min: 50, max: 75 },
      { key: `HHInc75_${radius}`, min: 75, max: 100 },
      { key: `HHInc100_${radius}`, min: 100, max: 150 },
      { key: `HHInc150_${radius}`, min: 150, max: 200 },
      { key: `HHInc200_${radius}`, min: 200 }
    ];
    
    // Sum households in the specified income bracket
    brackets.forEach(bracket => {
      const bracketValue = parseInt(data[bracket.key]) || 0;
      const bracketMin = bracket.min || 0;
      const bracketMax = bracket.max || Infinity;
      
      if ((bracketMin >= min || bracketMin === 0) && bracketMax <= max) {
        // Bracket falls completely within range
        inBracket += bracketValue;
      } else if (bracketMin < min && bracketMax > min) {
        // Bracket overlaps with lower bound
        // Simple approximation assuming even distribution within bracket
        const overlap = (bracketMax - min) / (bracketMax - bracketMin);
        inBracket += bracketValue * overlap;
      } else if (bracketMin < max && bracketMax > max) {
        // Bracket overlaps with upper bound
        // Simple approximation assuming even distribution within bracket
        const overlap = (max - bracketMin) / (bracketMax - bracketMin);
        inBracket += bracketValue * overlap;
      }
    });
    
    // Calculate percentage
    const percentage = (inBracket / total) * 100;
    return formatNumber(percentage, 1);
  } catch (error) {
    console.error('Error calculating income bracket:', error);
    return 'N/A';
  }
}

/**
 * Calculate percentage of one value relative to another
 * @param {number|string} numerator - The numerator
 * @param {number|string} denominator - The denominator
 * @returns {string} Formatted percentage
 */
function calculatePercentage(numerator, denominator) {
  const num = parseFloat(numerator);
  const den = parseFloat(denominator);
  
  if (isNaN(num) || isNaN(den) || den === 0) {
    return 'N/A';
  }
  
  return formatNumber((num / den) * 100, 1);
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
 * Format a number with specified decimal places
 * @param {number|string} num - Number to format
 * @param {number} decimals - Decimal places to include
 * @returns {string} Formatted number
 */
function formatNumber(num, decimals = 0) {
  const value = parseFloat(num);
  if (isNaN(value)) return 'N/A';
  return value.toFixed(decimals);
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
