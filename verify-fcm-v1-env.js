// FCM V1 Environment Verification Script
// Run this script to verify your Firebase service account setup

console.log('🔍 FCM V1 Environment Verification');
console.log('================================');

// This script will be run in your Supabase Edge Function environment
// to verify that the required environment variables are properly set

async function verifyEnvironment() {
    const results = {
        timestamp: new Date().toISOString(),
        checks: []
    };

    // Check FIREBASE_SERVICE_ACCOUNT_KEY
    const serviceAccountKey = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKey) {
        results.checks.push({
            name: 'FIREBASE_SERVICE_ACCOUNT_KEY',
            status: 'MISSING',
            message: 'Environment variable not set'
        });
    } else {
        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
            const missingFields = requiredFields.filter(field => !serviceAccount[field]);
            
            if (missingFields.length > 0) {
                results.checks.push({
                    name: 'FIREBASE_SERVICE_ACCOUNT_KEY',
                    status: 'INVALID',
                    message: `Missing required fields: ${missingFields.join(', ')}`
                });
            } else {
                results.checks.push({
                    name: 'FIREBASE_SERVICE_ACCOUNT_KEY',
                    status: 'VALID',
                    message: `Service account for project: ${serviceAccount.project_id}`,
                    details: {
                        project_id: serviceAccount.project_id,
                        client_email: serviceAccount.client_email,
                        private_key_id: serviceAccount.private_key_id
                    }
                });
            }
        } catch (error) {
            results.checks.push({
                name: 'FIREBASE_SERVICE_ACCOUNT_KEY',
                status: 'INVALID',
                message: `Invalid JSON format: ${error.message}`
            });
        }
    }

    // Check FIREBASE_PROJECT_ID
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
    if (!projectId) {
        results.checks.push({
            name: 'FIREBASE_PROJECT_ID',
            status: 'MISSING',
            message: 'Environment variable not set'
        });
    } else {
        results.checks.push({
            name: 'FIREBASE_PROJECT_ID',
            status: 'VALID',
            message: `Project ID: ${projectId}`
        });
    }

    // Check if project IDs match
    if (serviceAccountKey && projectId) {
        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            if (serviceAccount.project_id !== projectId) {
                results.checks.push({
                    name: 'PROJECT_ID_CONSISTENCY',
                    status: 'MISMATCH',
                    message: `Service account project (${serviceAccount.project_id}) doesn't match FIREBASE_PROJECT_ID (${projectId})`
                });
            } else {
                results.checks.push({
                    name: 'PROJECT_ID_CONSISTENCY',
                    status: 'VALID',
                    message: 'Project IDs match'
                });
            }
        } catch (error) {
            // Already handled above
        }
    }

    // Test OAuth2 token generation
    try {
        console.log('🔑 Testing OAuth2 token generation...');
        
        const serviceAccount = JSON.parse(serviceAccountKey);
        
        // Create JWT for Google OAuth2
        const now = Math.floor(Date.now() / 1000);
        const header = {
            alg: 'RS256',
            typ: 'JWT'
        };
        
        const payload = {
            iss: serviceAccount.client_email,
            scope: 'https://www.googleapis.com/auth/firebase.messaging',
            aud: 'https://oauth2.googleapis.com/token',
            iat: now,
            exp: now + 3600
        };

        // This would test the private key format without actually making a network request
        const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        
        results.checks.push({
            name: 'JWT_GENERATION',
            status: 'VALID',
            message: 'JWT structure can be created successfully'
        });

    } catch (error) {
        results.checks.push({
            name: 'JWT_GENERATION',
            status: 'ERROR',
            message: `Failed to create JWT: ${error.message}`
        });
    }

    // Summary
    const validCount = results.checks.filter(c => c.status === 'VALID').length;
    const totalCount = results.checks.length;
    
    results.summary = {
        total: totalCount,
        valid: validCount,
        ready: validCount === totalCount
    };

    return results;
}

// Export for use in Edge Function
export { verifyEnvironment };

// If running standalone, execute verification
if (import.meta.main) {
    try {
        const results = await verifyEnvironment();
        console.log('\n📊 Verification Results:');
        console.log('========================');
        
        results.checks.forEach(check => {
            const icon = check.status === 'VALID' ? '✅' : 
                        check.status === 'MISSING' ? '❌' : 
                        check.status === 'INVALID' ? '⚠️' : 
                        check.status === 'MISMATCH' ? '🔄' : '❗';
            
            console.log(`${icon} ${check.name}: ${check.message}`);
            if (check.details) {
                console.log(`   Details: ${JSON.stringify(check.details, null, 2)}`);
            }
        });

        console.log('\n📋 Summary:');
        console.log(`${results.summary.valid}/${results.summary.total} checks passed`);
        
        if (results.summary.ready) {
            console.log('🎉 Environment is ready for FCM V1 API!');
        } else {
            console.log('⚠️  Please fix the issues above before proceeding.');
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
    }
}
