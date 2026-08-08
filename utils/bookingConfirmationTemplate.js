const formatCurrency = value =>
    `£${Number(value || 0).toFixed(0)}`;

const formatCrew = helperCount =>
    Number(helperCount || 0) === 1
        ? "2 Person Crew"
        : "1 Person Crew";

const formatDate = date => {
    if (!date) return "Flexible";

    return new Date(date).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
};

const formatTimeSlot = slot => {

    switch (slot) {

        case "early":
            return "Early (Before 9 AM)";

        case "afternoon":
            return "Afternoon";

        case "nine_to_five":
        case "nineToFive":
        case "9_to_5":
        case "9-5":
            return "9:00 AM - 5:00 PM";

        default:
            return slot || "-";
    }

};

const FRONTEND_URL =
    "https://khan-moves-frontend.vercel.app/";

const getImages = () => {

    return {

        logo:
            `${FRONTEND_URL}/Khan_Logo_transparent.png`,

        banner:
            `${FRONTEND_URL}/templ_1.png`,

        movers:
            `${FRONTEND_URL}/templ_2.png`,

        van:
            `${FRONTEND_URL}/templ_3.png`

    };

};

const getStaticMapUrl = booking => {

    if (
        !booking.pickup?.lat ||
        !booking.delivery?.lat
    ) {
        return "";
    }

    return (
        `https://staticmap.openstreetmap.de/staticmap.php` +
        `?size=900x320` +
        `&zoom=8` +
        `&markers=${booking.pickup.lat},${booking.pickup.lng},red-pushpin` +
        `&markers=${booking.delivery.lat},${booking.delivery.lng},green-pushpin`
    );

};

module.exports = booking => {

    const images = getImages();

    const mapUrl =
        getStaticMapUrl(booking);

    return `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8"/>

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
/>

<title>

Khan Moves Booking

</title>

</head>

<body
style="
margin:0;
padding:0;
background:#f5f5f5;
font-family:Arial,Helvetica,sans-serif;
"
>

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
background:#f5f5f5;
padding:30px 10px;
"
>

<tr>

<td align="center">

<table
width="700"
cellpadding="0"
cellspacing="0"
style="
background:#ffffff;
border-radius:14px;
overflow:hidden;
box-shadow:0 10px 30px rgba(0,0,0,.08);
"
>

<tr>

<td
style="
background:#C0392B;
padding:45px 35px;
text-align:center;
"
>

<img

src="${images.logo}"

style="
width:180px;
margin-bottom:25px;
"

alt="Khan Moves"
/>

<h1
style="
margin:0;
color:#fff;
font-size:34px;
font-weight:bold;
"
>

Booking Received

</h1>

<p
style="
margin-top:15px;
color:#fdeaea;
font-size:16px;
line-height:26px;
"
>

Thank you for choosing
<b>Khan Moves.</b>

We've successfully received your booking request.

</p>

</td>

</tr>

<tr>

<td
style="
padding:35px;
"
>

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
background:#fafafa;
border:1px solid #ececec;
border-radius:12px;
"
>

<tr>

<td
align="center"
style="
padding:28px;
"
>

<div
style="
font-size:15px;
color:#888;
"
>

Estimated Quote

</div>

<div
style="
margin-top:10px;
font-size:42px;
font-weight:bold;
color:#C0392B;
"
>

${formatCurrency(
        booking.totalPrice
    )}

</div>

<div
style="
margin-top:10px;
font-size:15px;
color:#666;
"
>

Booking Reference

</div>

<div
style="
margin-top:8px;
font-size:20px;
font-weight:bold;
letter-spacing:1px;
"
>

${booking.bookingRef}

</div>

</td>

</tr>

</table>

<div
style="
height:25px;
"
></div>

<p
style="
font-size:16px;
color:#444;
line-height:28px;
margin:0;
"
>

Hi
<b>

${booking.customer?.name || "there"}

</b>,

<br/><br/>
Great to see you!

Thank you for choosing
<b>Khan Moves</b>

for your move from

<b>
    ${booking.pickup?.address || ""}
    ${booking.pickup?.town ? `, ${booking.pickup.town}` : ""}
    ${booking.pickup?.region ? `, ${booking.pickup.region}` : ""}
    ${booking.pickup?.postcode ? `, ${booking.pickup.postcode}` : ""}
</b>

to

<b>
    ${booking.delivery?.address || ""}
    ${booking.delivery?.town ? `, ${booking.delivery.town}` : ""}
    ${booking.delivery?.region ? `, ${booking.delivery.region}` : ""}
    ${booking.delivery?.postcode ? `, ${booking.delivery.postcode}` : ""}
</b>.

Our operations team is now reviewing your booking and will confirm availability shortly.

</p>
${mapUrl ? `

<div
style="
margin-top:35px;
"
>

<img

src="${mapUrl}"

alt="Route Map"

style="
width:100%;
border-radius:14px;
display:block;
border:1px solid #e6e6e6;
"

>

</div>

` : ""}

<div
style="
height:35px;
"
></div>

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
border:1px solid #ececec;
border-radius:12px;
overflow:hidden;
"
>

<tr>

<td
colspan="2"
style="
background:#C0392B;
padding:16px 22px;
font-size:18px;
font-weight:bold;
color:#ffffff;
"
>

Booking Details

</td>

</tr>

<tr>

<td
style="
padding:16px 22px;
font-weight:bold;
color:#444;
width:170px;
border-bottom:1px solid #eee;
"
>

Service

</td>

<td
style="
padding:16px 22px;
color:#666;
border-bottom:1px solid #eee;
"
>

${booking.serviceType}

</td>

</tr>

<tr>

<td
style="
padding:16px 22px;
font-weight:bold;
color:#444;
border-bottom:1px solid #eee;
"
>

Crew

</td>

<td
style="
padding:16px 22px;
color:#666;
border-bottom:1px solid #eee;
"
>

${formatCrew(
        booking.helperCount
    )}

</td>

</tr>

<tr>

<td
style="
padding:16px 22px;
font-weight:bold;
color:#444;
border-bottom:1px solid #eee;
"
>

Moving Date

</td>

<td
style="
padding:16px 22px;
color:#666;
border-bottom:1px solid #eee;
"
>

${formatDate(
        booking.date
    )}

</td>

</tr>

<tr>

<td
style="
padding:16px 22px;
font-weight:bold;
color:#444;
border-bottom:1px solid #eee;
"
>

Time Slot

</td>

<td
style="
padding:16px 22px;
color:#666;
border-bottom:1px solid #eee;
"
>

${formatTimeSlot(
        booking.timeSlot
    )}

</td>

</tr>

<tr>

<td
style="
padding:16px 22px;
font-weight:bold;
color:#444;
border-bottom:1px solid #eee;
"
>

Distance

</td>

<td
style="
padding:16px 22px;
color:#666;
border-bottom:1px solid #eee;
"
>

${booking.distance} miles

</td>

</tr>

<tr>

<td
style="
padding:16px 22px;
font-weight:bold;
color:#444;
border-bottom:1px solid #eee;
"
>

Volume

</td>

<td
style="
padding:16px 22px;
color:#666;
border-bottom:1px solid #eee;
"
>

${Number(
        booking.totalVolume
    ).toFixed(2)} m³

</td>

</tr>

<tr>

<td
style="
padding:16px 22px;
font-weight:bold;
color:#444;
vertical-align:top;
border-bottom:1px solid #eee;
"
>

Pickup

</td>

<td
style="
padding:16px 22px;
color:#666;
border-bottom:1px solid #eee;
line-height:24px;
"
>

${booking.pickup.address}

</td>

</tr>

<tr>

<td
style="
padding:16px 22px;
font-weight:bold;
color:#444;
vertical-align:top;
"
>

Delivery

</td>

<td
style="
padding:16px 22px;
color:#666;
line-height:24px;
"
>

${booking.delivery.address}

</td>

</tr>

</table>

<div
style="
height:35px;
"
></div>

<div
style="
background:#fafafa;
border-radius:12px;
padding:28px;
border:1px solid #ececec;
"
>

<h2
style="
margin:0;
font-size:24px;
color:#C0392B;
"
>

What happens now?

</h2>

<ul
style="
margin-top:20px;
padding-left:22px;
line-height:34px;
font-size:16px;
color:#444;
"
>

<li>

✅
Booking received successfully

</li>

<li>

⏳
Our team will review your booking

</li>

<li>

📞
We'll contact you by phone, WhatsApp or email if required

</li>

<li>

🧾
Invoice will be sent after confirmation

</li>

</ul>

</div>

<div
style="
height:35px;
"
></div>

<p
style="
font-size:16px;
line-height:30px;
color:#555;
margin:0;
"
>

If you need to make any changes to your booking, including your moving date, address, time slot or items, simply reply to this email or contact our support team.

We're always happy to help.

</p>

<div
style="
height:35px;
"
></div>
<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="margin-top:10px;"
>
    <tr>
        <td
            align="center"
            style="
                padding:0;
                font-size:0;
            "
        >

            <img
                src="${images.banner}"
                alt="Khan Moves"
                draggable="false"
                style="
                    width:31.5%;
                    height:140px;
                    object-fit:cover;
                    border-radius:8px;
                    display:inline-block;
                    vertical-align:top;
                    margin-right:2%;
                    user-select:none;
                    -webkit-user-drag:none;
                "
            />

            <img
                src="${images.movers}"
                alt="Professional Movers"
                draggable="false"
                style="
                    width:31.5%;
                    height:140px;
                    object-fit:cover;
                    border-radius:8px;
                    display:inline-block;
                    vertical-align:top;
                    margin-right:2%;
                    user-select:none;
                    -webkit-user-drag:none;
                "
            />

            <img
                src="${images.van}"
                alt="Moving Van"
                draggable="false"
                style="
                    width:31.5%;
                    height:140px;
                    object-fit:cover;
                    border-radius:8px;
                    display:inline-block;
                    vertical-align:top;
                    user-select:none;
                    -webkit-user-drag:none;
                "
            />

        </td>
    </tr>
</table>

<div
style="
height:35px;
"
></div>

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
background:#C0392B;
border-radius:12px;
"
>

<tr>

<td
align="center"
style="
padding:35px;
"
>

<h2
style="
margin:0;
color:#fff;
font-size:28px;
"
>

Need Help?

</h2>

<p
style="
margin-top:15px;
color:#fdeaea;
font-size:16px;
line-height:28px;
"
>

If you have any questions regarding your booking,
our friendly team is available every day from
9:00 AM to 8:00 PM.

</p>

<a

href="tel:07424153126"

style="
display:inline-block;
margin-top:25px;
padding:14px 32px;
background:#ffffff;
color:#C0392B;
text-decoration:none;
font-weight:bold;
border-radius:8px;
font-size:16px;
"

>

Call Now

</a>

</td>

</tr>

</table>

<div
style="
height:30px;
"
></div>

<p
style="
font-size:14px;
line-height:26px;
color:#777;
text-align:center;
margin:0;
"
>

Thank you for choosing
<b>Khan Moves</b>.

We appreciate your trust and look forward
to making your move smooth and stress-free.

</p>

<div
style="
height:30px;
"
></div>

<hr
style="
border:none;
border-top:1px solid #e6e6e6;
"
>

<div
style="
padding-top:25px;
text-align:center;
font-size:13px;
line-height:24px;
color:#888;
"
>

<p
style="margin:0;"
>

<a
href="tel:07424153126"
style="
color:#C0392B;
text-decoration:none;
"
>

07424 153126

</a>

&nbsp;&nbsp;|&nbsp;&nbsp;

<a
href="https://wa.me/447424153126"
style="
color:#C0392B;
text-decoration:none;
"
>

WhatsApp

</a>

</p>

<p
style="
margin-top:14px;
"
>

Khan Moves Limited

<br>

265 Golden Hillock Road

<br>

Sparkbrook,
Birmingham,
England,
B11 2PH

<br><br>

Company No. 06837274

</p>

<p
style="
margin-top:14px;
font-size:12px;
color:#999;
"
>

If you received this email by mistake,
please ignore it.

</p>

</div>

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>

</html>

`;

};