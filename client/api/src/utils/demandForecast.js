/**
 * Demand forecast utility — 7-day moving average per blood group per hospital.
 *
 * Inspired by the 2026 "Blood Bank Management System with AI Demand Forecasting"
 * academic paper cited in the implementation plan, but implemented as a simple
 * aggregation pipeline (no ML library required) so it's defensible and fast.
 *
 * The algorithm:
 *   1. Count how many requests were fulfilled for a given (hospital, bloodGroup)
 *      pair in each of the last N days.
 *   2. Compute the mean (moving average) of daily demand.
 *   3. Compare forecast against current stock. If stock < (forecast * daysThreshold),
 *      flag the item as "predicted shortage".
 *
 * Because we're a university project with limited historical data, the function
 * gracefully returns a null forecast when fewer than 3 data points exist.
 */

'use strict';

const { Request }   = require('../models/Request');
const { Inventory } = require('../models/Inventory');

const WINDOW_DAYS      = 7;   // moving average window
const SHORTAGE_HORIZON = 3;   // flag if stock < (avg daily demand × 3 days)

/**
 * Compute a 7-day moving average demand forecast for all blood groups
 * across all hospitals (or a specific hospital).
 *
 * @param {string} [hospitalId] - Optional; if omitted, aggregates all hospitals.
 * @returns {Promise<Array<{
 *   hospitalId: string,
 *   hospitalName: string,
 *   bloodGroup: string,
 *   currentUnits: number,
 *   avgDailyDemand: number,
 *   daysOfStock: number | null,
 *   predictedShortage: boolean
 * }>>}
 */
async function computeDemandForecast(hospitalId) {
  const windowStart = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Aggregate fulfilled requests in the time window.
  const matchStage = {
    status:      'fulfilled',
    fulfilledAt: { $gte: windowStart },
  };
  if (hospitalId) matchStage.hospital = require('mongoose').Types.ObjectId.createFromHexString(String(hospitalId));

  const demandData = await Request.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          hospital:   '$hospital',
          bloodGroup: '$patientBloodGroup',
          // Truncate to day for per-day bucketing.
          day: { $dateToString: { format: '%Y-%m-%d', date: '$fulfilledAt' } },
        },
        dailyUnits: { $sum: '$unitsNeeded' },
      },
    },
    {
      $group: {
        _id: {
          hospital:   '$_id.hospital',
          bloodGroup: '$_id.bloodGroup',
        },
        dataPoints:     { $sum: 1 },
        totalUnits:     { $sum: '$dailyUnits' },
      },
    },
    {
      $lookup: {
        from:         'organizations',
        localField:   '_id.hospital',
        foreignField: '_id',
        as:           'hospitalInfo',
      },
    },
    { $unwind: { path: '$hospitalInfo', preserveNullAndEmpty: true } },
    {
      $project: {
        _id:          0,
        hospitalId:   '$_id.hospital',
        hospitalName: '$hospitalInfo.name',
        bloodGroup:   '$_id.bloodGroup',
        dataPoints:   1,
        avgDailyDemand: {
          $cond: [
            { $gte: ['$dataPoints', 1] },
            { $divide: ['$totalUnits', WINDOW_DAYS] },
            0,
          ],
        },
      },
    },
  ]);

  if (demandData.length === 0) return [];

  // Fetch current inventory for each (hospital, bloodGroup) pair.
  const inventoryFilter = hospitalId ? { hospital: hospitalId } : {};
  const inventoryItems  = await Inventory.find(inventoryFilter).lean();
  const inventoryMap    = {};
  for (const inv of inventoryItems) {
    inventoryMap[`${inv.hospital}_${inv.bloodGroup}`] = inv.units;
  }

  return demandData.map(item => {
    const key          = `${item.hospitalId}_${item.bloodGroup}`;
    const currentUnits = inventoryMap[key] ?? null;
    const avg          = item.avgDailyDemand;

    let daysOfStock        = null;
    let predictedShortage  = false;

    // Only compute when we have enough data points and current stock info.
    if (item.dataPoints >= 3 && currentUnits !== null && avg > 0) {
      daysOfStock       = Math.floor(currentUnits / avg);
      predictedShortage = daysOfStock < SHORTAGE_HORIZON;
    } else if (currentUnits === 0) {
      predictedShortage = true;
    }

    return {
      ...item,
      currentUnits,
      daysOfStock,
      predictedShortage,
    };
  });
}

module.exports = { computeDemandForecast, WINDOW_DAYS, SHORTAGE_HORIZON };
