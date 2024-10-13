const axios = require('axios');
const { RhythmOfferRequest, ServiceRequestBundle } = require('../models');

exports.createRhythmOfferRequest = async (req, res) => {
  const { user_id, uuid } = req.params;
  const { house_id, security_deposit, service_start_date, enrollment_type, meter_id } = req.body;

  try {
    // Fetch the offer snapshot by UUID
    const offerSnapshotResponse = await axios.get(
      `http://localhost:3000/api/v2/offer-snapshots/${uuid}`
    );

    const offerSnapshot = offerSnapshotResponse.data;

    // Create a new ServiceRequestBundle
    const serviceRequestBundle = await ServiceRequestBundle.create({
      status: 'pending',
      houseId: house_id,
      userId: user_id,
    });

    // Create the new RhythmOfferRequest by copying fields from the offer snapshot
    const newRequest = await RhythmOfferRequest.create({
      uuid: offerSnapshot.uuid,
      url: offerSnapshot.url,
      term_months: offerSnapshot.term_months,
      title: offerSnapshot.title,
      rhythm_kwh_rate: offerSnapshot.rhythm_kwh_rate,
      tdsp_kwh_rate: offerSnapshot.tdsp_kwh_rate,
      tdsp_customer_charge_amount: offerSnapshot.tdsp_customer_charge_amount,
      description_en: offerSnapshot.description_en,
      description_es: offerSnapshot.description_es,
      long_description_en: offerSnapshot.long_description_en,
      long_description_es: offerSnapshot.long_description_es,
      price_2000_kwh: offerSnapshot.price_2000_kwh,
      price_1000_kwh: offerSnapshot.price_1000_kwh,
      price_500_kwh: offerSnapshot.price_500_kwh,
      rhythm_efl_en: offerSnapshot.rhythm_efl_en,
      rhythm_efl_es: offerSnapshot.rhythm_efl_es,
      rhythm_tos_en: offerSnapshot.rhythm_tos_en,
      rhythm_tos_es: offerSnapshot.rhythm_tos_es,
      rhythm_yrac_en: offerSnapshot.rhythm_yrac_en,
      rhythm_yrac_es: offerSnapshot.rhythm_yrac_es,
      utility_name: offerSnapshot.utility_name,
      utility_id: offerSnapshot.utility_id,
      utility_charges: offerSnapshot.utility_charges,
      renewable_energy: offerSnapshot.renewable_energy,
      base_charge_amount: offerSnapshot.base_charge_amount,
      earliest_service_start_date: offerSnapshot.earliest_service_start_date,
      early_termination_fee_amount: offerSnapshot.early_termination_fee_amount,
      grace_period_days: offerSnapshot.grace_period_days,
      rhythm_charge_breakdown: offerSnapshot.rhythm_charge_breakdown,
      zip_codes: offerSnapshot.zip_codes,
      house_id,
      user_id,
      security_deposit,
      service_start_date,
      enrollment_type,
      meter_id,
      security_deposit_paid: false, // Default value
      roommate_accepted: false, // Default value
      service_request_bundle_id: serviceRequestBundle.id, // Link to bundle
    });

    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Error creating rhythm offer request:', error);
    res.status(500).json({ error: 'Failed to create rhythm offer request.' });
  }
};
