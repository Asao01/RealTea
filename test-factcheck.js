/**
 * Test script for /api/factCheck endpoint
 * Usage: node test-factcheck.js
 */

async function testFactCheck() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing /api/factCheck endpoint\n');

  // Test cases
  const testCases = [
    {
      name: 'High-profile recent event',
      eventDescription: 'The James Webb Space Telescope discovered the oldest known galaxy',
      searchQuery: 'James Webb oldest galaxy discovery'
    },
    {
      name: 'Low credibility claim',
      eventDescription: 'Aliens landed in New York City yesterday',
      searchQuery: 'aliens landed New York'
    },
    {
      name: 'Historical event',
      eventDescription: 'Apollo 11 landed on the moon in 1969',
      searchQuery: 'Apollo 11 moon landing 1969'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 TEST: ${testCase.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Claim: "${testCase.eventDescription}"`);
    console.log(`\n⏳ Sending request...`);

    try {
      const response = await fetch(`${baseUrl}/api/factCheck`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventDescription: testCase.eventDescription,
          searchQuery: testCase.searchQuery
        })
      });

      const data = await response.json();

      console.log(`\n📊 RESULT:`);
      console.log(`Status: ${response.status}`);
      console.log(`Accepted: ${data.accepted ? '✅ YES' : '❌ NO'}`);
      
      if (data.accepted) {
        console.log(`\n✅ Event ACCEPTED`);
        console.log(`Title: ${data.result.title}`);
        console.log(`Summary: ${data.result.summary}`);
        console.log(`Credibility: ${data.result.credibilityScore}`);
        console.log(`Sources: ${data.result.metadata.independentSourceCount} independent sources`);
        console.log(`Verified: ${data.result.isVerified ? 'Yes' : 'No'}`);
      } else {
        console.log(`\n❌ Event REJECTED`);
        console.log(`Reasons:`);
        data.reasons?.forEach(reason => console.log(`  - ${reason}`));
        console.log(`\nDetails:`);
        console.log(`  Credibility: ${data.result.credibilityScore} (min: ${data.result.minimumRequirements.credibilityScore})`);
        console.log(`  Sources: ${data.result.independentSourceCount} (min: ${data.result.minimumRequirements.independentSources})`);
      }

      if (data.result?.metadata) {
        console.log(`\n📈 Statistics:`);
        console.log(`  Total sources: ${data.result.metadata.sourceCount}`);
        console.log(`  Independent sources: ${data.result.metadata.independentSourceCount}`);
        console.log(`  Agreement ratio: ${(data.result.metadata.agreementRatio * 100).toFixed(0)}%`);
        console.log(`  Recency: ${data.result.metadata.recencyDays} days`);
        console.log(`  Processing time: ${data.result.metadata.processingTimeMs}ms`);
      }

    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
    }

    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n\n${'='.repeat(60)}`);
  console.log('✅ All tests complete!');
  console.log(`${'='.repeat(60)}\n`);
}

// Run tests
testFactCheck().catch(console.error);

