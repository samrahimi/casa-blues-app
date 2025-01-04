// Define async function to execute the tool
export async function executeToolAsync(functionName, args, toolCallId) {
    let result;
    
    try {
        switch(functionName) {
            case 'check_availability': {
                // First check availability
                const availabilityResponse = await fetch(`/availability?unit=${encodeURIComponent(args.unit_name)}&start_time=${encodeURIComponent(args.check_in_date)}&end_time=${encodeURIComponent(args.check_out_date)}`);
                const availabilityData = await availabilityResponse.json();

                if (!availabilityData.available) {
                    result = { available: false, message: "The unit is not available for these dates." };
                } else {
                    // Get unit pricing
                    const unitsResponse = await fetch('/units');
                    const units = await unitsResponse.json();
                    const unit = units.find(u => u.name === args.unit_name);
                    
                    if (!unit) {
                        throw new Error(`Unit ${args.unit_name} not found`);
                    }

                    // Calculate number of days
                    const checkIn = new Date(args.check_in_date);
                    const checkOut = new Date(args.check_out_date);
                    const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                    
                    // Calculate total price based on length of stay
                    let totalPrice;
                    if (days >= 30) {
                        totalPrice = Math.ceil(days / 30) * unit.monthly_rate;
                    } else if (days >= 7) {
                        totalPrice = Math.ceil(days / 7) * unit.weekly_rate;
                    } else {
                        totalPrice = days * unit.daily_rate;
                    }

                    result = {
                        available: true,
                        total_price: totalPrice,
                        currency: 'MXN',
                        message: `${args.unit_name} is available for the requested dates. Total price: ${totalPrice} MXN`
                    };
                }
                break;
            }
            case 'book_unit': {
                // Format pets array if provided
                const formattedPets = args.pets || [];
                
                // Create the reservation
                const response = await fetch('/reservations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        unit: args.unit_name,
                        start_time: args.check_in_date,
                        end_time: args.check_out_date,
                        name: args.guest_name,
                        email: args.guest_email,
                        phone: args.guest_phone,
                        group_size: args.num_guests,
                        notes: `${args.notes || ''}\nPets: ${formattedPets.map(p => `${p.species}: ${p.details}`).join(', ')}\nReturning guest: ${args.returning_guest}`
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to create reservation');
                }

                const data = await response.json();
                result = {
                    success: true,
                    reservation_id: data.id,
                    message: "Reservation created successfully. Our team will contact you within 24 hours to confirm your booking."
                };
                break;
            }
            case 'escalate_request': {
                // Store escalated request in sessionStorage for demo purposes
                const escalatedRequests = JSON.parse(sessionStorage.getItem('escalatedRequests') || '[]');
                escalatedRequests.push({
                    timestamp: new Date().toISOString(),
                    customer_name: args.customer_name,
                    customer_contact: args.customer_contact,
                    request_details: args.request_details,
                    priority_level: args.priority_level
                });
                sessionStorage.setItem('escalatedRequests', JSON.stringify(escalatedRequests));
                
                result = {
                    success: true,
                    message: "Your request has been escalated to a senior manager who will contact you shortly."
                };
                break;
            }
            case 'get_prices': {
                const response = await fetch('/units');
                const units = await response.json();
                const unit = units.find(u => u.name === args.unit_name);
                
                if (!unit) {
                    throw new Error(`Unit ${args.unit_name} not found`);
                }

                result = {
                    daily_rate: unit.daily_rate,
                    weekly_rate: unit.weekly_rate,
                    monthly_rate: unit.monthly_rate,
                    currency: 'MXN'
                };
                break;
            }
            case 'log_interaction': {
                // Store interaction log in sessionStorage for demo purposes
                const interactionLogs = JSON.parse(sessionStorage.getItem('interactionLogs') || '[]');
                interactionLogs.push({
                    timestamp: new Date().toISOString(),
                    ...args
                });
                sessionStorage.setItem('interactionLogs', JSON.stringify(interactionLogs));
                
                result = {
                    success: true,
                    message: "Interaction logged successfully"
                };
                break;
            }
        }

        return {
            tool_call_id: toolCallId,
            role: "tool",
            name: functionName,
            content: JSON.stringify(result)
        };
    } catch (error) {
        console.error(`Error executing tool ${functionName}:`, error);
        return {
            tool_call_id: toolCallId,
            role: "tool",
            name: functionName,
            content: JSON.stringify({ error: error.message })
        };
    }
}