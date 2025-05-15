const { HouseServiceLedger } = require('../models');

exports.getActiveLedger = async (req, res) => {
  const { houseServiceId } = req.params;
  try {
    const ledger = await HouseServiceLedger.findOne({
      where: { houseServiceId, status: 'active' },
      order: [['createdAt', 'DESC']]
    });

    if (!ledger) {
      return res.status(404).json({ error: 'No active ledger found' });
    }

    res.json(ledger);
  } catch (error) {
    console.error('Error fetching active ledger:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAllLedgersForHouseService = async (req, res) => {
  const { houseServiceId } = req.params;
  try {
    const ledgers = await HouseServiceLedger.findAll({
      where: { houseServiceId },
      order: [['createdAt', 'DESC']]
    });

    res.json({ ledgers });
  } catch (error) {
    console.error('Error fetching ledgers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
