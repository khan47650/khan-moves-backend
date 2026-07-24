const roundMoney = value => Math.round((value + Number.EPSILON) * 100) / 100;

const getCrewSize = helperCount => Number(helperCount) > 0 ? 2 : 1;

const getBaseFee = helperCount => {
    return getCrewSize(helperCount) === 2 ? 54 : 30;
};

const getDistanceCharge = (distanceMiles, helperCount) => {
    const distance = Math.max(0, Number(distanceMiles) || 0);

    if (distance <= 10) return 0;

    const twoPersonCrew = getCrewSize(helperCount) === 2;
    const standardRate = twoPersonCrew ? 0.78 : 0.62;
    const longDistanceRate = twoPersonCrew ? 0.38 : 0.31;

    const milesFrom11To44 = Math.min(Math.max(distance - 10, 0), 34);
    const milesFrom45 = Math.max(distance - 44, 0);

    return (
        milesFrom11To44 * standardRate +
        milesFrom45 * longDistanceRate
    );
};

const getVolumeCharge = volumeM3 => {
    const volume = Math.max(0, Number(volumeM3) || 0);

    if (volume === 0) return 0;

    const units = Math.ceil(volume * 10);
    let charge = 0;

    const tier1Units = Math.min(units, 30);
    charge += tier1Units * 0.70;

    if (units > 30) {
        const tier2Units = Math.min(units - 30, 40);
        charge += tier2Units * 0.90;
    }

    if (units > 70) {
        const tier3Units = Math.min(units - 70, 50);
        charge += tier3Units * 1.10;
    }

    if (units > 120) {
        const tier4Units = units - 120;
        charge += tier4Units * 1.40;
    }

    return charge;
};

const getFloorCharge = (floorLevel, hasLift, volumeM3) => {
    const volume = Math.max(0, Number(volumeM3) || 0);

    if (!floorLevel || floorLevel === "ground") return 0;

    if (floorLevel === "basement") {
        return 5 * volume;
    }

    const floorNumber = {
        "1st": 1,
        "2nd": 2,
        "3rd": 3,
        "4th+": 4
    }[floorLevel] || 0;

    if (!floorNumber) return 0;

    return (hasLift ? 2 : 5) * floorNumber * volume;
};

const getParkingCharge = hasParking => {
    return hasParking ? 0 : 30;
};

const getDaySurchargeRate = date => {
    if (!date) return 0;

    const day = new Date(`${date}T12:00:00`).getDay();

    if (day === 5) return 0.05;
    if (day === 6) return 0.10;
    if (day === 0) return 0.15;

    return 0;
};

const calculateSubtotal = data => {
    const volume = Math.max(
        0,
        Number(data.volume ?? data.totalVolume) || 0
    );
    const helperCount = Number(data.helperCount) > 0 ? 1 : 0;

    const charges = {
        baseFee: getBaseFee(helperCount),
        distanceCharge: getDistanceCharge(data.distance, helperCount),
        volumeCharge: getVolumeCharge(volume),
        pickupFloorCharge: getFloorCharge(
            data.pickupFloor?.floorLevel,
            data.pickupFloor?.hasLift,
            volume
        ),
        deliveryFloorCharge: getFloorCharge(
            data.deliveryFloor?.floorLevel,
            data.deliveryFloor?.hasLift,
            volume
        ),
        pickupParkingCharge: getParkingCharge(
            data.pickupFloor?.hasParking ?? true
        ),
        deliveryParkingCharge: getParkingCharge(
            data.deliveryFloor?.hasParking ?? true
        ),
        dismantleCharge:
            Math.max(0, Number(data.dismantleCount) || 0) * 20,
        assemblyCharge:
            Math.max(0, Number(data.assemblyCount) || 0) * 30,
        packingCharge: data.packingService ? 49 : 0,
        timeSlotCharge: data.timeSlot === "afternoon" ? 10 : 0
    };

    charges.subtotal = Object.values(charges).reduce(
        (sum, amount) => sum + amount,
        0
    );

    return charges;
};

const calculateTotalPrice = data => {
    const charges = calculateSubtotal(data);
    let total = charges.subtotal;

    if (data.dateType === "specific" && data.date) {
        total += total * getDaySurchargeRate(data.date);
    }

    if (data.dateType === "flexible") {
        total *= 0.8;
    }

    return Math.round(total);
};

const getPriceBreakdown = data => {
    const volume = Math.max(
        0,
        Number(data.volume ?? data.totalVolume) || 0
    );
    const helperCount = Number(data.helperCount) > 0 ? 1 : 0;
    const crewSize = getCrewSize(helperCount);
    const charges = calculateSubtotal(data);

    const breakdown = [
        {
            label: `Base fee (${crewSize}-person crew)`,
            amount: roundMoney(charges.baseFee)
        }
    ];

    if (charges.distanceCharge > 0) {
        breakdown.push({
            label: `Mileage (${Number(data.distance) || 0} mi, first 10 mi included)`,
            amount: roundMoney(charges.distanceCharge)
        });
    }

    if (charges.volumeCharge > 0) {
        breakdown.push({
            label: `Items volume (${volume.toFixed(1)} m³)`,
            amount: roundMoney(charges.volumeCharge)
        });
    }

    if (charges.pickupFloorCharge > 0) {
        breakdown.push({
            label: `Pickup floor (${data.pickupFloor?.floorLevel}${data.pickupFloor?.hasLift ? " + lift" : ""
                })`,
            amount: roundMoney(charges.pickupFloorCharge)
        });
    }

    if (charges.deliveryFloorCharge > 0) {
        breakdown.push({
            label: `Delivery floor (${data.deliveryFloor?.floorLevel}${data.deliveryFloor?.hasLift ? " + lift" : ""
                })`,
            amount: roundMoney(charges.deliveryFloorCharge)
        });
    }

    if (charges.pickupParkingCharge > 0) {
        breakdown.push({
            label: "No parking — pickup",
            amount: 30
        });
    }

    if (charges.deliveryParkingCharge > 0) {
        breakdown.push({
            label: "No parking — delivery",
            amount: 30
        });
    }

    if (charges.dismantleCharge > 0) {
        breakdown.push({
            label: `Dismantling ×${data.dismantleCount}`,
            amount: charges.dismantleCharge
        });
    }

    if (charges.assemblyCharge > 0) {
        breakdown.push({
            label: `Assembly ×${data.assemblyCount}`,
            amount: charges.assemblyCharge
        });
    }

    if (charges.packingCharge > 0) {
        breakdown.push({
            label: "Packing service",
            amount: charges.packingCharge
        });
    }

    if (charges.timeSlotCharge > 0) {
        breakdown.push({
            label: "Afternoon time slot",
            amount: charges.timeSlotCharge
        });
    }

    let runningTotal = charges.subtotal;

    if (data.dateType === "specific" && data.date) {
        const rate = getDaySurchargeRate(data.date);

        if (rate > 0) {
            const surcharge = roundMoney(runningTotal * rate);
            const dayName = new Date(
                `${data.date}T12:00:00`
            ).toLocaleDateString("en-GB", {
                weekday: "long"
            });

            breakdown.push({
                label: `${dayName} surcharge (${rate * 100}%)`,
                amount: surcharge
            });

            runningTotal += surcharge;
        }
    }

    if (data.dateType === "flexible") {
        const discount = roundMoney(runningTotal * 0.2);

        breakdown.push({
            label: "Flexible date discount (20%)",
            amount: -discount
        });

        runningTotal -= discount;
    }

    return {
        breakdown,
        total: Math.round(runningTotal)
    };
};

const getLoadingTimeMinutes = volumeM3 => {
    return Math.round(Math.max(0, Number(volumeM3) || 0) * 5);
};

module.exports = {
    calculateTotalPrice,
    getPriceBreakdown,
    getLoadingTimeMinutes
};