/**
 * Khan Moves — Backend Price Calculator
 * Must remain identical to frontend priceCalculator.js
 */

const PRICING_CONFIG = {
    1: {
        BASE: 13.85,
        VOLUME_COEF: 7.0,
        VOLUME_POWER: 1.30,
        MILE_0_50: 0.700,
        MILE_50_90: 0.500,
        MILE_90_PLUS: 0.800,
        INTERACTION: 0.0460,
        MIN_PRICE: 30,
        FLOOR_SURCHARGE_PER_FLOOR: 15,
        FLOOR_SURCHARGE_WITH_LIFT: 10
    },

    2: {
        BASE: 40.0,
        VOLUME_COEF: 9.2,
        VOLUME_POWER: 1.30,
        MILE_0_50: 0.800,
        MILE_50_90: 0.650,
        MILE_90_PLUS: 1.000,
        INTERACTION: 0.0650,
        MIN_PRICE: 60,
        FLOOR_SURCHARGE_PER_FLOOR: 25,
        FLOOR_SURCHARGE_WITH_LIFT: 15
    },

    // SINGLE_TRIP_MAX_M3: 18,
    // LOCAL_MULTI_TRIP_MAX_MILES: 15,
    // EXTRA_TRIP_FEE: 30
};

const DAY_IN_MS =
    24 * 60 * 60 * 1000;

// const CONTACT_SUPPORT_MESSAGE =
//     "Due to the size and distance of this move, please contact customer support for a confirmed quote.";

const roundMoney = value => Math.round(Number(value) || 0);

const numberValue = value =>
    Number(value || 0);

const positiveNumber = value =>
    Math.max(
        0,
        numberValue(value)
    );

const getCrewSize = helperCount =>
    numberValue(helperCount) > 0
        ? 2
        : 1;

const getMileageCharge = (
    distanceMiles,
    config
) => {
    const distance =
        positiveNumber(
            distanceMiles
        );

    const first50Miles =
        Math.min(
            distance,
            50
        );

    const milesFrom50To90 =
        Math.min(
            Math.max(
                distance - 50,
                0
            ),
            40
        );

    const milesAbove90 =
        Math.max(
            distance - 90,
            0
        );

    return (
        first50Miles *
        config.MILE_0_50 +
        milesFrom50To90 *
        config.MILE_50_90 +
        milesAbove90 *
        config.MILE_90_PLUS
    );
};

const getVolumeCharge = (
    volumeM3,
    config
) => {
    const volume =
        positiveNumber(
            volumeM3
        );

    if (volume === 0) {
        return 0;
    }

    return (
        config.VOLUME_COEF *
        Math.pow(
            volume,
            config.VOLUME_POWER
        )
    );
};

const getFloorNumber =
    floorLevel => {
        return (
            {
                ground: 0,
                basement: 1,
                "1st": 1,
                "2nd": 2,
                "3rd": 3,
                "4th+": 4
            }[floorLevel] || 0
        );
    };

const getFloorCharge = (
    floorLevel,
    hasLift,
    config
) => {
    const floors =
        getFloorNumber(
            floorLevel
        );

    if (floors === 0) {
        return 0;
    }

    if (hasLift) {
        return config
            .FLOOR_SURCHARGE_WITH_LIFT;
    }

    return (
        config
            .FLOOR_SURCHARGE_PER_FLOOR *
        floors
    );
};

const getParkingCharge = (
    hasParking,
    volumeM3
) => {
    if (hasParking !== false) {
        return 0;
    }

    const volume =
        positiveNumber(
            volumeM3
        );

    if (volume >= 6) {
        return 40;
    }

    if (volume >= 2) {
        return 20;
    }

    return 0;
};

const getTimeSlotCharge =
    timeSlot => {
        if (
            timeSlot ===
            "afternoon"
        ) {
            return 20;
        }

        if (
            [
                "nine_to_five",
                "nineToFive",
                "9_to_5",
                "9-5"
            ].includes(timeSlot)
        ) {
            return 15;
        }

        return 0;
    };

const getTimeSlotLabel =
    timeSlot => {
        if (
            timeSlot ===
            "afternoon"
        ) {
            return "Afternoon time slot";
        }

        if (
            [
                "nine_to_five",
                "nineToFive",
                "9_to_5",
                "9-5"
            ].includes(timeSlot)
        ) {
            return "9:00 AM - 5:00 PM time slot";
        }

        return "Time slot";
    };

const getUKTodayDate = () => {
    const parts =
        new Intl.DateTimeFormat(
            "en-GB",
            {
                timeZone:
                    "Europe/London",

                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        ).formatToParts(
            new Date()
        );

    const getPart = type =>
        parts.find(
            part =>
                part.type === type
        )?.value || "";

    return `${getPart(
        "year"
    )}-${getPart(
        "month"
    )}-${getPart("day")}`;
};

const parseDateOnly = value => {
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            String(value || "")
        )
    ) {
        return null;
    }

    const [
        year,
        month,
        day
    ] = value
        .split("-")
        .map(Number);

    return Date.UTC(
        year,
        month - 1,
        day
    );
};

const getDateSurcharge =
    date => {
        const selectedDate =
            parseDateOnly(date);

        const today =
            parseDateOnly(
                getUKTodayDate()
            );

        if (
            selectedDate === null ||
            today === null
        ) {
            return {
                rate: 0,
                label: ""
            };
        }

        const daysAhead =
            Math.round(
                (
                    selectedDate -
                    today
                ) /
                DAY_IN_MS
            );

        if (daysAhead === 0) {
            return {
                rate: 0.30,
                label: "Same-day surcharge (30%)"
            };
        }

        if (daysAhead === 1) {
            return {
                rate: 0.22,
                label:
                    "Next-day surcharge (22%)"
            };
        }

        if (daysAhead === 2) {
            return {
                rate: 0.14,
                label:
                    "Second-day surcharge (14%)"
            };
        }

        const weekDay =
            new Date(
                selectedDate
            ).getUTCDay();

        if (weekDay === 5) {
            return {
                rate: 0.07,
                label:
                    "Friday surcharge (7%)"
            };
        }

        if (weekDay === 6) {
            return {
                rate: 0.04,
                label:
                    "Saturday surcharge (4%)"
            };
        }

        if (weekDay === 0) {
            return {
                rate: 0.05,
                label:
                    "Sunday surcharge (5%)"
            };
        }

        return {
            rate: 0,
            label: ""
        };
    };

const calculateCoreCharges = ({
    distance,
    volume,
    crewSize,
    pickupFloor,
    deliveryFloor
}) => {
    const config =
        PRICING_CONFIG[
        crewSize
        ];

    const baseFee =
        config.BASE;

    const volumeCharge =
        getVolumeCharge(
            volume,
            config
        );

    const distanceCharge =
        getMileageCharge(
            distance,
            config
        );

    const interactionCharge =
        config.INTERACTION *
        volume *
        distance;

    const pickupFloorCharge =
        getFloorCharge(
            pickupFloor
                ?.floorLevel,

            pickupFloor
                ?.hasLift,

            config
        );

    const deliveryFloorCharge =
        getFloorCharge(
            deliveryFloor
                ?.floorLevel,

            deliveryFloor
                ?.hasLift,

            config
        );

    const rawCoreTotal =
        baseFee +
        volumeCharge +
        distanceCharge +
        interactionCharge +
        pickupFloorCharge +
        deliveryFloorCharge;

    const minimumPriceAdjustment =
        Math.max(
            0,
            config.MIN_PRICE -
            rawCoreTotal
        );

    return {
        baseFee,
        volumeCharge,
        distanceCharge,
        interactionCharge,
        pickupFloorCharge,
        deliveryFloorCharge,
        minimumPriceAdjustment,

        coreTotal:
            rawCoreTotal +
            minimumPriceAdjustment
    };
};

const calculatePricing =
    data => {
        const volume =
            positiveNumber(
                data.volume ??
                data.totalVolume
            );

        const distance =
            positiveNumber(
                data.distance
            );

        const crewSize =
            getCrewSize(
                data.helperCount
            );

        const config =
            PRICING_CONFIG[
            crewSize
            ];

        const tripsNeeded =
            Math.max(
                1,
                Math.ceil(
                    volume /
                    PRICING_CONFIG
                        .SINGLE_TRIP_MAX_M3
                )
            );

        // const requiresContactSupport =
        //     volume >
        //     PRICING_CONFIG
        //         .SINGLE_TRIP_MAX_M3 &&
        //     distance >
        //     PRICING_CONFIG
        //         .LOCAL_MULTI_TRIP_MAX_MILES;

        // if (
        //     requiresContactSupport
        // ) {
        //     return {
        //         total: null,
        //         breakdown: [],

        //         crewSize,
        //         tripsNeeded,
        //         multiTrip: false,

        //         requiresContactSupport:
        //             true,

        //         pricingStatus:
        //             "contact_support",

        //         note:
        //             CONTACT_SUPPORT_MESSAGE
        //     };
        // }

        const charges =
            calculateCoreCharges({
                distance,
                volume,
                crewSize,

                pickupFloor:
                    data.pickupFloor,

                deliveryFloor:
                    data.deliveryFloor
            });

        // const extraTrips =
        //     Math.max(
        //         tripsNeeded - 1,
        //         0
        //     );

        // const extraMileageCharge =
        //     extraTrips *
        //     distance *
        //     2 *
        //     config.MILE_0_50;

        // const extraTripFees =
        //     extraTrips *
        //     PRICING_CONFIG
        //         .EXTRA_TRIP_FEE;

        const pickupParkingCharge =
            getParkingCharge(
                data.pickupFloor
                    ?.hasParking ??
                true,

                volume
            );

        const deliveryParkingCharge =
            getParkingCharge(
                data.deliveryFloor
                    ?.hasParking ??
                true,

                volume
            );

        const dismantleCharge =
            positiveNumber(
                data.dismantleCount
            ) * 20;

        const assemblyCharge =
            positiveNumber(
                data.assemblyCount
            ) * 30;

        const packingCharge =
            data.packingService
                ? 20
                : 0;

        const timeSlotCharge =
            getTimeSlotCharge(
                data.timeSlot
            );

        const movingCharges =
            charges.coreTotal +
            pickupParkingCharge +
            deliveryParkingCharge;

        const addOnCharges =
            dismantleCharge +
            assemblyCharge +
            packingCharge +
            timeSlotCharge;

        let runningTotal =
            movingCharges +
            addOnCharges;

        const breakdown = [
            {
                label: `Base fee (${crewSize}-person crew)`,

                amount:
                    roundMoney(
                        charges.baseFee
                    )
            }
        ];

        if (
            charges.volumeCharge >
            0
        ) {
            breakdown.push({
                label: `Items volume (${volume.toFixed(
                    2
                )} m³)`,

                amount:
                    roundMoney(
                        charges
                            .volumeCharge
                    )
            });
        }

        if (
            charges.distanceCharge >
            0
        ) {
            breakdown.push({
                label: `Mileage (${distance} mi)`,

                amount:
                    roundMoney(
                        charges
                            .distanceCharge
                    )
            });
        }

        if (
            charges.interactionCharge >
            0
        ) {
            breakdown.push({
                label:
                    "Volume and distance adjustment",

                amount:
                    roundMoney(
                        charges
                            .interactionCharge
                    )
            });
        }

        if (
            charges.pickupFloorCharge >
            0
        ) {
            breakdown.push({
                label: `Pickup floor (${data.pickupFloor?.floorLevel}${data.pickupFloor
                    ?.hasLift
                    ? " + lift"
                    : ""
                    })`,

                amount:
                    roundMoney(
                        charges
                            .pickupFloorCharge
                    )
            });
        }

        if (
            charges.deliveryFloorCharge >
            0
        ) {
            breakdown.push({
                label: `Delivery floor (${data.deliveryFloor?.floorLevel}${data.deliveryFloor
                    ?.hasLift
                    ? " + lift"
                    : ""
                    })`,

                amount:
                    roundMoney(
                        charges
                            .deliveryFloorCharge
                    )
            });
        }

        if (
            charges
                .minimumPriceAdjustment >
            0
        ) {
            breakdown.push({
                label:
                    "Minimum job price adjustment",

                amount:
                    roundMoney(
                        charges
                            .minimumPriceAdjustment
                    )
            });
        }

        // if (
        //     extraMileageCharge >
        //     0
        // ) {
        //     breakdown.push({
        //         label: `Extra trip mileage ×${extraTrips}`,

        //         amount:
        //             roundMoney(
        //                 extraMileageCharge
        //             )
        //     });
        // }

        // if (
        //     extraTripFees > 0
        // ) {
        //     breakdown.push({
        //         label: `Extra trip fee ×${extraTrips}`,

        //         amount:
        //             roundMoney(
        //                 extraTripFees
        //             )
        //     });
        // }

        if (pickupParkingCharge > 0) {
            breakdown.push({
                label: "Pickup parking adjustment",
                amount: roundMoney(pickupParkingCharge)
            });
        }


        if (deliveryParkingCharge > 0) {
            breakdown.push({
                label: "Delivery parking adjustment",
                amount: roundMoney(deliveryParkingCharge)
            });
        }

        if (
            dismantleCharge > 0
        ) {
            breakdown.push({
                label: `Dismantling ×${positiveNumber(
                    data.dismantleCount
                )}`,

                amount:
                    roundMoney(
                        dismantleCharge
                    )
            });
        }

        if (
            assemblyCharge > 0
        ) {
            breakdown.push({
                label: `Assembly ×${positiveNumber(
                    data.assemblyCount
                )}`,

                amount:
                    roundMoney(
                        assemblyCharge
                    )
            });
        }

        if (
            packingCharge > 0
        ) {
            breakdown.push({
                label:
                    "Packing service",

                amount:
                    roundMoney(
                        packingCharge
                    )
            });
        }

        if (
            timeSlotCharge > 0
        ) {
            breakdown.push({
                label:
                    getTimeSlotLabel(
                        data.timeSlot
                    ),

                amount:
                    roundMoney(
                        timeSlotCharge
                    )
            });
        }

        if (
            data.dateType ===
            "specific" &&
            data.date
        ) {
            const surcharge =
                getDateSurcharge(
                    data.date
                );

            if (
                surcharge.rate >
                0
            ) {
                const surchargeAmount =
                    roundMoney(
                        movingCharges *
                        surcharge.rate
                    );

                runningTotal =
                    movingCharges +
                    surchargeAmount +
                    addOnCharges;

                breakdown.push({
                    label:
                        surcharge.label,

                    amount:
                        surchargeAmount
                });
            }
        }

        if (
            data.dateType ===
            "flexible"
        ) {
            const discount =
                roundMoney(
                    movingCharges * 0.2
                );

            runningTotal =
                movingCharges -
                discount +
                addOnCharges;

            breakdown.push({
                label:
                    "Flexible date discount (20%)",

                amount:
                    -discount
            });
        }

        return {
            total: roundMoney(runningTotal),

            breakdown,

            crewSize,

            requiresContactSupport: false,

            pricingStatus: "calculated",

            note: ""
        };
    };

const calculateTotalPrice =
    data =>
        calculatePricing(
            data
        ).total;

const getPriceBreakdown =
    data =>
        calculatePricing(
            data
        );

const getLoadingTimeMinutes =
    volumeM3 =>
        Math.round(
            positiveNumber(
                volumeM3
            ) * 5
        );

module.exports = {
    calculatePricing,
    calculateTotalPrice,
    getPriceBreakdown,
    getLoadingTimeMinutes,
    PRICING_CONFIG
};