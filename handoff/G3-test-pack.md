# G3 test pack (real BSE data, fetched 2026-11-11)

Hand-check ChatGPT's outputs against this. IDs are the first 8 chars of the BSE NEWSID.

## A. classify_batch input (45 real filings, labels deliberately omitted)

```json
[
 {
  "id": "ce6309c9",
  "headline": "We enclose herewith the Press Release being issued today by the Company for your records and display on your Notice Board.",
  "subcategory": "Press Release / Media Release"
 },
 {
  "id": "5025e69b",
  "headline": "The update on the Outcome of the Special Committee of the Board of Directors dated October 21, 2026, is as enclosed.",
  "subcategory": "Meeting Updates"
 },
 {
  "id": "2e8d2bdf",
  "headline": "Disclosure pursuant to Paragraph 9.1(a) of the Chapter VIII of SEBI Master Circular No. SEBI/HO/DDHS/DDHS-PoD/P/CIR/2025/0000000137 dated October 15,2025",
  "subcategory": "Half Yearly Report (SEBI Circular No. CIR/IMD/DF-1/67/2017)"
 },
 {
  "id": "5f00980e",
  "headline": "The outcome of the Committee Meeting in relation to the QIP issue opening dated October 21, 2026, is as enclosed.",
  "subcategory": "Issue of Securities"
 },
 {
  "id": "b7973cf1",
  "headline": "The Exchange has sought clarification from Sun Pharmaceutical Industries Ltd on November 2, 2026, with reference to news appeared in https://www.thehindu.com/ dated October 30, 2026 quoting ....",
  "subcategory": "Clarification"
 },
 {
  "id": "3e57668b",
  "headline": "Investor Presentation",
  "subcategory": "Investor Presentation"
 },
 {
  "id": "47dc0c32",
  "headline": "Press release dated October 1, 2026",
  "subcategory": "Press Release / Media Release"
 },
 {
  "id": "9a29605f",
  "headline": "The intimation of allotment of 400,000 equity shares of INR 5 each to the ESOP Trust of the Company on October 2, 2026, is as enclosed.",
  "subcategory": "Allotment of Equity Shares"
 },
 {
  "id": "ef085bc5",
  "headline": "The intimation of approval of the terms of NCD and CP issuance in as enclosed",
  "subcategory": "Issue of Securities"
 },
 {
  "id": "70fcba2b",
  "headline": "Certificate under Regulation 74(5) of the SEBI (Depositories and Participants) Regulations, 2018 for the quarter ended 30 September 2026.",
  "subcategory": "Certificate under Reg. 74 (5) of SEBI (DP) Regulations, 2018"
 },
 {
  "id": "0728c182",
  "headline": "Allotment of 91,38,522 equity shares pursuant to exercise of ESOP/RSU",
  "subcategory": "Allotment of ESOP / ESPS"
 },
 {
  "id": "f993b851",
  "headline": "Relinquishment of position ad Non-Executive Vice Chairman of the company by Mr. K. K. Maheshwari.",
  "subcategory": "Resignation of Director"
 },
 {
  "id": "5043cd2c",
  "headline": "Schedule of Analysts''/Investors'' Meet.",
  "subcategory": "Analyst / Investor Meet"
 },
 {
  "id": "85a90a42",
  "headline": "Tata Consultancy Services Limited has informed the Exchange about completion of acquisition of BBY Services India LLP.",
  "subcategory": "Acquisition"
 },
 {
  "id": "af2ee01b",
  "headline": "Acquisition of equity shares in T Steel Holdings Pte. Ltd",
  "subcategory": "Acquisition"
 },
 {
  "id": "0b6e71c4",
  "headline": "Outcome of the Meeting of the Investment Committee, as empowered by the Board, held on October 1, 2026",
  "subcategory": "Outcome without intimation"
 },
 {
  "id": "39b874bc",
  "headline": "Proceedings of 34th Annual General Meeting (AGM) under Regulation 30 of the SEBI (Listing Obligations and Disclosure Requirements) Regulations, 2015.",
  "subcategory": "AGM"
 },
 {
  "id": "3f6097a2",
  "headline": "The Scrutiniser''s Report for the Extraordinary General Meeting held on Monday, October 5, 2026, is as enclosed.",
  "subcategory": "EGM"
 },
 {
  "id": "3dbcfb55",
  "headline": "The intimation regarding the receipt of Credit Rating from M/s. ICRA Limited, is as enclosed.",
  "subcategory": "Credit Rating"
 },
 {
  "id": "bc24f084",
  "headline": "The Outcome of Investor sessions held on Wednesday, September 23, 2026, is as enclosed.",
  "subcategory": "Analyst / Investor Meet"
 },
 {
  "id": "f3f0a540",
  "headline": "Redemption of Commercial Paper",
  "subcategory": "Intimation of Repayment of Commercial Paper (CP)"
 },
 {
  "id": "9e16b3c7",
  "headline": "Please refer the enclosed file",
  "subcategory": "Press Release / Media Release"
 },
 {
  "id": "c0ba2198",
  "headline": "Tata Steel Ltdhas informed BSE that the meeting of the Board of Directors of the Company is scheduled on 27/10/2026 ,inter alia, to consider and approve audited Standalone and unaudited ....",
  "subcategory": "Board Meeting"
 },
 {
  "id": "bfdf6a9e",
  "headline": "The Exchange has received the Disclosures of reasons for encumbrance by promoter of listed companies under Reg. 31(1) read with Regulation 28(3) of SEBI (SAST) Regulations, 2011 on October ....",
  "subcategory": "Disclosures under Reg. 31(1) and 31(2) of SEBI (SAST) Regulations, 2011"
 },
 {
  "id": "f117d194",
  "headline": "The Exchange has received the disclosure under Regulation 10(7) in respect of acquisition under Regulation 10(1)(a)(ii)of SEBI (Substantial Acquisition of Shares & Takeovers) Regulations, ....",
  "subcategory": "Disclosures under Reg. 10(7) of SEBI (SAST) Regulations, 2011"
 },
 {
  "id": "e677d431",
  "headline": "The Exchange has received Disclosure under Regulation 31(1) and 31(2) of SEBI (Substantial Acquisition of Shares & Takeovers) Regulations, 2011 on September 30, 2026 for Vedanta Ltd",
  "subcategory": "Disclosures under Reg. 31(1) and 31(2) of SEBI (SAST) Regulations, 2011"
 },
 {
  "id": "e35ea451",
  "headline": "Newspaper publication for unaudited financial results for the quarter and half year ended 30 September 2026",
  "subcategory": "Newspaper Publication"
 },
 {
  "id": "35bf242b",
  "headline": "Unaudited standalone and consolidated financial results for the quarter and half year ended 30 September 2026",
  "subcategory": "Financial Results"
 },
 {
  "id": "05cae776",
  "headline": "Submission of Minutes of 34th Annual General Meeting of the Company and Scrutinizer''s Report along with Voting Results under Regulation 44 of the SEBI (Listing Obligations and Disclosure ....",
  "subcategory": "AGM"
 },
 {
  "id": "51ff9a97",
  "headline": "Disclosure under Regulation 30 of the SEBI Listing Obligations and Disclosure Requirements) Regulations, 2015",
  "subcategory": "Change in Management"
 },
 {
  "id": "62f56117",
  "headline": "Scrutinizer''s Report for the Postal Ballot of Titan Company Limited",
  "subcategory": "Postal Ballot"
 },
 {
  "id": "55fb605b",
  "headline": "Appointment of Mr. Anup Bagchi as an Additional Director and as the Managing Director & Chief Executive Officer of the Bank",
  "subcategory": "Change in Directorate"
 },
 {
  "id": "e3e14132",
  "headline": "Outcome of the Board Meeting held on 12 October 2026",
  "subcategory": "Resignation of Director"
 },
 {
  "id": "110ecc5b",
  "headline": "Grant of Stock Options - UltraTech Cement Limited Employee Stock Option Scheme 2022",
  "subcategory": "Allotment of ESOP / ESPS"
 },
 {
  "id": "fb99b35b",
  "headline": "Approval of second interim dividend",
  "subcategory": "Dividend"
 },
 {
  "id": "1d865404",
  "headline": "Notice of Extraordinary General Meeting scheduled to be held on Monday, 2 November 2026",
  "subcategory": "EGM"
 },
 {
  "id": "52d08a9e",
  "headline": "Capital Raise through Preferential Issue",
  "subcategory": "Preferential Issue"
 },
 {
  "id": "911dd43a",
  "headline": "Intimation under Regulation 30 - Receipt of GST Order",
  "subcategory": "General"
 },
 {
  "id": "ab8859c9",
  "headline": "Intimation of Appointment of Statutory Auditor",
  "subcategory": "Appointment of Statutory Auditor/s"
 },
 {
  "id": "4343dc20",
  "headline": "Intimation of closure of Trading Window",
  "subcategory": "Closure of Trading Window"
 },
 {
  "id": "73c8bf80",
  "headline": "The Board Meeting to be held on 27/10/2026 has been revised to 07/11/2026 The Board Meeting to be held on October 27, 2026, has been revised to November 7, 2026.",
  "subcategory": "Board Meeting Rescheduled"
 },
 {
  "id": "769b3262",
  "headline": "Redemption of Commercial Paper",
  "subcategory": "Intimation of Repayment of Commercial Paper (CP)"
 },
 {
  "id": "ee6123a8",
  "headline": "Outcome of the Board Meeting",
  "subcategory": "Financial Results"
 },
 {
  "id": "f253cc87",
  "headline": "Please find enclosed herewith confirmation certificate in the matter of Regulation 74(5) of the SEBI (Depositories and Participants) Regulations, 2018 received from MUFG Intime India Private ....",
  "subcategory": "Certificate under Reg. 74 (5) of SEBI (DP) Regulations, 2018"
 },
 {
  "id": "b665c797",
  "headline": "Capital Raise through QIP.",
  "subcategory": "Qualified Institutional Placement"
 }
]
```

## B. so_what inputs

### BAJFINANCE · id 9817a9b7 · subcategory: Change in Management
headline: The Board of Directors at their meeting held today, i.e., 19 October 2026, approved the re-appointment of Prashant Verma as Chief Information Security Officer (CISO) as per RBI Guidelines, ....

```
[page 1]
Registered Office: 4th Floor, Bajaj Finserv House, Off Pune-Ahmednagar Road, Viman Nagar, Pune – 411014 
Corporate Office Extn.: 3rd Floor, Panchshil Tech Park, Viman Nagar, Pune - 411 014 
Tel: +91 20 7157 6403 | Fax: +91 20 7157 6364 
Corporate ID No.: L65910MH1987PLC042961 | Email ID: investor.service@bajajﬁnserv.in 
https://www.aboutbajajfinserv.com/finance-about-us 
 
19 October 2026 
To 
The Manager 
Listing Department 
BSE Limited 
Phiroze Jeejeebhoy Towers, 
Dalal Street, 
Mumbai - 400 001 
To 
The Manager 
Listing Department 
National Stock Exchange of India Limited 
Exchange Plaza, C-1. Block G, 
Bandra - Kurla Complex, Bandra (East) 
Mumbai - 400 051 
SCRIP CODE: 500034 
SCRIP CODE: BAJFINANCE – EQ 
 
Dear Sir/Madam, 
 
Sub.: Disclosure under Regulation 30 of SEBI (Listing Obligations and Disclosure 
Requirements) Regulation, 2015 (the ‘SEBI Listing Regulations, 2015’) –Change in 
Senior Management Personnel 
Pursuant to Regulation 30, read with Part A, Para A of Schedule Ill of the SEBI (Listing 
Obligations and Disclosure Requirements) Regulations, 2015, we wish to inform you that 
the Board of Directors of the Company, at its meeting held today, based on the 
recommendation of Nomination and Remuneration Committee, has approved the re-
appointment of Prashant Verma as Chief Information Security Officer (CISO) as per RBI 
Guidelines, effective 1 February 2027, for a period of three (3) years, subject to 
regulatory approvals, if any. 
The disclosures as required under Regulation 30 of the Listing Regulations, read with 
SEBI Master Circular no. SEBI/HO/CFD/PoD2/CIR/P/0155 dated 11 November 2024, are 
enclosed herewith as Annexure - A.  
The meeting commenced at 16:15 Hrs IST and concluded at 17:32 Hrs IST. 
We request you to kindly take this on record. 
Thanking you. 
FOR BAJAJ FINANCE LIMITED 
 
 
R. Vijay 
Company Secretary 
Email ID: investor.service@bajajfinserv.in  
Encl.: As above 
R VIJAY
Digitally signed by R VIJAY 
Date: 2026.10.19 17:46:52 
+05'30'

[page 2]
Registered Office: 4th Floor, Bajaj Finserv House, Off Pune-Ahmednagar Road, Viman Nagar, Pune – 411014 
Corporate Office Extn.: 3rd Floor, Panchshil Tech Park, Viman Nagar, Pune - 411 014 
Tel: +91 20 7157 6403 | Fax: +91 20 7157 6364 
Corporate ID No.: L65910MH1987PLC042961 | Email ID: investor.service@bajajﬁnserv.in 
https://www.aboutbajajfinserv.com/finance-about-us 
 
Annexure – A 
Details under Regulation 30, Part A of Schedule Ill of the SEBI Listing Regulations, 2015 
read along with SEBI Master Circular No. SEBI/HO/CFD/PoD2/CIR/P/0155 dated 11 
November 2024: 
Sr. 
No
. 
Details of events  
Information of such event (s) 
1.  
Reason for change viz. appointment, 
re- 
appointment, 
resignation, 
removal, death or otherwise 
Re-appointment of Prashant Verma, as Chief 
Information Security Officer 
2.  
Date of Appointment/ 
re-appointment/cessation 
(as 
applicable) 
 
1 February 2027 
3.  
Term of Appointment/ 
re-appointment  
On the terms and conditions as applicable to 
senior employees of the Company as per 
Company’s policy 
4.  
Brief Profile (in case of appointment) Prashant Verma is the Chief Information Security 
Officer of Bajaj Finance Ltd since February 1, 
2024.  
 
Prashant Verma has around 21 years of full-time 
experience on Security Domain. He joined us as 
head of Cyber Risk Unit 7 years back and is now 
heading Information Security. In his previous job, 
he has architected security services and has 
worked as security auditor and consultant for 
various domestic and international banks and 
insurance companies. He is CISSP and is co-
author of couple of security books. 
5.  
Disclosure of relationships between 
directors (in case of appointment of 
a director). 
NA
```

### RELIANCE · id 8849035d · subcategory: Credit Rating
headline: Intimation of re-affirmation of rating by S&P Global Ratings is attached.

```
[page 1]
Regd. Office: 3rd Floor, Maker Chambers IV, 222, Nariman Point, Mumbai- 400 021, India 
Phone #: +91-22-3555 5000, Telefax: +91-22-2204 2268. E-mail: investor.relations@ril.com, Website: www.ril.com 
CIN- L17110MH1973PLC019786 
November 4, 2026 
 
BSE Limited 
Phiroze Jeejeebhoy Towers, 
Dalal Street, 
Mumbai 400 001 
National Stock Exchange of India Limited 
Exchange Plaza, Plot No. C/1, G Block, 
Bandra-Kurla Complex,  
Bandra (East), Mumbai 400 051 
 
Scrip Code: 500325  
Trading Symbol: RELIANCE  
 
Dear Sirs, 
 
Sub: Re-affirmation of rating with respect to the Senior Unsecured US$ Denominated 
Fixed Rate Notes of the Company 
 
This is to inform that S&P Global Ratings, vide its press release dated November 3, 2026, 
has reaffirmed the credit rating of “A –” with a “Stable” outlook issued by it for the Senior 
Unsecured US$ Denominated Fixed Rate Notes of the Company. 
 
This is for information and records. 
 
Thanking you 
 
Yours faithfully,  
 
For Reliance Industries Limited 
 
 
 
Savithri Parekh  
Company Secretary and  
Compliance Officer 
 
Copy to: 
 
Luxembourg Stock Exchange 
35A boulevard Joseph II 
L-1840 Luxembourg 
 
Singapore Exchange Limited  
2 Shenton Way, #02-02 SGX Centre 1, 
Singapore 068804 
 
SAVITHRI 
PAREKH
Digitally signed by 
SAVITHRI PAREKH 
Date: 2026.11.04 
20:34:11 +05'30'
```

### TCS · id 85a90a42 · subcategory: Acquisition
headline: Tata Consultancy Services Limited has informed the Exchange about completion of acquisition of BBY Services India LLP.

```
[page 1]
9th Floor Nirmal Building Nariman Point Mumbai 400 021 
Tel 91 22 6778 9595 Fax 91 22 6630 3672 e-mail corporate.office@tcs.com website www.tcs.com 
Registered Office 9th Floor Nirmal Building Nariman Point Mumbai 400 021 
Corporate Identity No. (CIN): L22210MH1995PLC084781 
 
 
TCS/SE/110/2026-27 
 
October 15, 2026 
 
National Stock Exchange of India Limited 
             BSE Limited 
Exchange Plaza, C-1, Block G, 
 
 
             P. J. Towers,  
Bandra Kurla Complex, Bandra (East),                           Dalal Street, 
Mumbai - 400051  
 
 
  
 
 
 Mumbai - 400001 
Symbol - TCS 
 
 
 
 
             Scrip Code No. - 532540 
 
Dear Sirs, 
 
Sub:  Disclosure under Regulation 30 of SEBI (Listing Obligations and Disclosure 
Requirements) Regulations, 2015 – Completion of acquisition of BBY Services 
India LLP 
Ref:  Letter no. TCS/SE/94/2026-27 dated October 1, 2026 
 
In furtherance to our aforesaid letter pertaining to the acquisition of 100% partnership interest 
in BBY Services India LLP, we wish to inform you that the Company has completed the 
acquisition today i.e. October 15, 2026. Accordingly, BBY Services India LLP has become a 
wholly owned subsidiary of the Company with effect from today. 
  
The above information is also available on the website of the Company www.tcs.com. 
 
This is for your information and record. 
 
 
Thanking you, 
Yours faithfully, 
For Tata Consultancy Services Limited 
 
 
Yashaswin Sheth 
Company Secretary 
ACS 15388 
  
YASHASWIN 
NARENDRA 
SHETH
Digitally signed by 
YASHASWIN NARENDRA 
SHETH 
Date: 2026.10.15 13:25:41 
+05'30'
```

### TCS · id 716097f6 · subcategory: Date of payment of Dividend
headline: Second interim dividend shall be paid on Friday, October 30, 2026

```
[page 1]
9th Floor Nirmal Building Nariman Point Mumbai 400 021 
Tel 91 22 6778 9595 Fax 91 22 6630 3672 e-mail corporate.office@tcs.com website www.tcs.com 
Registered Office 9th Floor Nirmal Building Nariman Point Mumbai 400 021 
Corporate Identity No. (CIN): L22210MH1995PLC084781 
 
TCS/BM/100/SE/2026-27 
 
October 8, 2026 
 
National Stock Exchange of India Limited 
 
 
 BSE Limited 
Exchange Plaza, C-1, Block G,                                                      P. J. Towers,   
Bandra Kurla Complex, Bandra (East) 
 
              Dalal Street,   
 
 
Mumbai - 400051 
                                                                  Mumbai - 400001   
 
Symbol - TCS                                                                                Scrip Code No. 532540  
 
Dear Sirs, 
 
Sub:  Financial Results for the quarter and six-month period ended September 30, 2026 and 
declaration of second interim dividend  
 
We enclose the audited standalone financial results of the Company and audited consolidated financial 
results of the Company and its subsidiaries, under Indian Accounting Standards, along with the  
Auditor’s Reports of the Company for the quarter and six-month period ended September 30, 2026, which 
have been approved and taken on record at a meeting of the Board of Directors of the Company held today.  
 
We would like to inform you that at the Board Meeting held today, the Directors have declared a second 
interim dividend of INR 12 per Equity Share of INR 1 each of the Company, for the financial year 2026-27. 
 
The second interim dividend shall be paid on Friday, October 30, 2026, to the equity shareholders of the 
Company, whose names appear on the Register of Members or in the records of the Depositories as beneficial 
owners of the shares as on Wednesday, October 14, 2026, which is the Record Date fixed for this purpose. 
 
The above information is also available on the website of the Company www.tcs.com. 
 
Thanking you, 
 
Yours faithfully, 
For Tata Consultancy Services Limited  
 
 
 
Yashaswin Sheth 
Company Secretary 
ACS 15388 
 
 
Encl: As above 
 
YASHASWIN 
NARENDRA SHETH
Digitally signed by YASHASWIN NARENDRA SHETH 
Date: 2026.10.08 15:34:33 +05'30'

[page 2]
B S R & Co. LLP
Chartered Accountants
14th Floor, Central B Wing and North C Wing
Nesco IT Park 4, Nesco Center
Western Express Highway
Goregaon (East), Mumbai – 400 063, India
Telephone: +91 (22) 6257 1000
Fax: +91 (22) 6257 1010
Registered Office:
B S R & Co. (a partnership firm with Registration No. BA61223) converted into B S R & Co. LLP (a 
Limited Liability Partnership with LLP Registration No. AAB-8181) with effect from October 14, 2013
14th Floor, Central B Wing and North C Wing, Nesco IT Park 4, Nesco 
Center, Western Express Highway, Goregaon (East), Mumbai - 400063
Page 1 of 6
Independent Auditor’s Report
To the Board of Directors of Tata Consultancy Services Limited
Report on the audit of the Consolidated Financial Results
Opinion
We have audited the accompanying Statement of Consolidated Financial Results of Tata Consultancy 
Services Limited (“Holding Company”) and its subsidiaries (Holding Company and its subsidiaries together 
referred to as “the Group”), for the quarter ended 30 September 2026 and for the period from 1 April 2026 
to 30 September 2026, (“the Statement”), being submitted by the Holding Company pursuant to the 
requirement of Regulation 33 of the Securities and Exchange Board of India (Listing Obligations and 
Disclosure Requirements) Regulations, 2015, as amended ("Listing Regulations").
In our opinion and to the best of our information and according to the explanations given to us, the 
Statement:
a.
includes the results of the entities mentioned in Annexure I to the Statement;
b.
is presented in accordance with the requirements of Regulation 33 of the Listing Regulations as 
amended; and
c.
gives a true and fair view in conformity with the applicable accounting standards, and other accounting 
principles generally accepted in India, of consolidated total comprehensive income (comprising of net 
profit and other comprehensive loss/income) and other financial information of the Group for the 
quarter ended 30 September 2026 and for the period from 1 April 2026 to 30 September 2026.
Basis for Opinion
We conducted our audit in accordance with the Standards on Auditing (“SAs”) specified under section 
143(10) of the Companies Act, 2013 (“the Act”). Our responsibilities under those SAs are further described 
in the Auditor’s Responsibilities for the Audit of the Consolidated Financial Results section of our report. 
We are independent of the Group in accordance with the Code of Ethics issued by the Institute of 
Chartered Accountants of India together with the ethical requirements that are relevant to our audit of the 
financial statements under the provisions of the Act, and the Rules thereunder, and we have fulfilled our 
other ethical responsibilities in accordance with these requirements and the Code of Ethics. We believe 
that the audit evidence we have obtained, is sufficient and appropriate to provide a basis for our opinion 
on the consolidated financial results.
Management’s and Board of Directors’/Trustees' Responsibilities for the Consolidated Financial 
Results
These quarterly consolidated financial results as well as the year to date consolidated financial results 
have been prepared on the basis of the consolidated interim financial statements.
The Holding Company’s Management and the Board of Directors are responsible for the preparation and 
presentation of these consolidated financial results that give a true and fair view of the consolidated net 
profit/ loss and other comprehensive income and other financial information of the Group in accordance 
with the recognition and measurement principles laid down in Indian Accounting Standard 34, ‘Interim 
Financial Reporting’ prescribed under Section 133 of the Act read with relevant rules issued thereunder
```

## C. results_extract inputs (first 8 pages of each results PDF; check units/period columns)

### TCS · id 966b7e15 · 'Financial Results for the quarter and six-month period ended September 30, 2026 and declaration of second interim dividend' · PDF pages total: 22

```
[page 1]
9th Floor Nirmal Building Nariman Point Mumbai 400 021 
Tel 91 22 6778 9595 Fax 91 22 6630 3672 e-mail corporate.office@tcs.com website www.tcs.com 
Registered Office 9th Floor Nirmal Building Nariman Point Mumbai 400 021 
Corporate Identity No. (CIN): L22210MH1995PLC084781 
 
TCS/BM/100/SE/2026-27 
 
October 8, 2026 
 
National Stock Exchange of India Limited 
 
 
 BSE Limited 
Exchange Plaza, C-1, Block G,                                                      P. J. Towers,   
Bandra Kurla Complex, Bandra (East) 
 
              Dalal Street,   
 
 
Mumbai - 400051 
                                                                  Mumbai - 400001   
 
Symbol - TCS                                                                                Scrip Code No. 532540  
 
Dear Sirs, 
 
Sub:  Financial Results for the quarter and six-month period ended September 30, 2026 and 
declaration of second interim dividend  
 
We enclose the audited standalone financial results of the Company and audited consolidated financial 
results of the Company and its subsidiaries, under Indian Accounting Standards, along with the  
Auditor’s Reports of the Company for the quarter and six-month period ended September 30, 2026, which 
have been approved and taken on record at a meeting of the Board of Directors of the Company held today.  
 
We would like to inform you that at the Board Meeting held today, the Directors have declared a second 
interim dividend of INR 12 per Equity Share of INR 1 each of the Company, for the financial year 2026-27. 
 
The second interim dividend shall be paid on Friday, October 30, 2026, to the equity shareholders of the 
Company, whose names appear on the Register of Members or in the records of the Depositories as beneficial 
owners of the shares as on Wednesday, October 14, 2026, which is the Record Date fixed for this purpose. 
 
The above information is also available on the website of the Company www.tcs.com. 
 
Thanking you, 
 
Yours faithfully, 
For Tata Consultancy Services Limited  
 
 
 
Yashaswin Sheth 
Company Secretary 
ACS 15388 
 
 
Encl: As above 
 
YASHASWIN 
NARENDRA SHETH
Digitally signed by YASHASWIN NARENDRA SHETH 
Date: 2026.10.08 15:34:33 +05'30'

[page 2]
B S R & Co. LLP
Chartered Accountants
14th Floor, Central B Wing and North C Wing
Nesco IT Park 4, Nesco Center
Western Express Highway
Goregaon (East), Mumbai – 400 063, India
Telephone: +91 (22) 6257 1000
Fax: +91 (22) 6257 1010
Registered Office:
B S R & Co. (a partnership firm with Registration No. BA61223) converted into B S R & Co. LLP (a 
Limited Liability Partnership with LLP Registration No. AAB-8181) with effect from October 14, 2013
14th Floor, Central B Wing and North C Wing, Nesco IT Park 4, Nesco 
Center, Western Express Highway, Goregaon (East), Mumbai - 400063
Page 1 of 6
Independent Auditor’s Report
To the Board of Directors of Tata Consultancy Services Limited
Report on the audit of the Consolidated Financial Results
Opinion
We have audited the accompanying Statement of Consolidated Financial Results of Tata Consultancy 
Services Limited (“Holding Company”) and its subsidiaries (Holding Company and its subsidiaries together 
referred to as “the Group”), for the quarter ended 30 September 2026 and for the period from 1 April 2026 
to 30 September 2026, (“the Statement”), being submitted by the Holding Company pursuant to the 
requirement of Regulation 33 of the Securities and Exchange Board of India (Listing Obligations and 
Disclosure Requirements) Regulations, 2015, as amended ("Listing Regulations").
In our opinion and to the best of our information and according to the explanations given to us, the 
Statement:
a.
includes the results of the entities mentioned in Annexure I to the Statement;
b.
is presented in accordance with the requirements of Regulation 33 of the Listing Regulations as 
amended; and
c.
gives a true and fair view in conformity with the applicable accounting standards, and other accounting 
principles generally accepted in India, of consolidated total comprehensive income (comprising of net 
profit and other comprehensive loss/income) and other financial information of the Group for the 
quarter ended 30 September 2026 and for the period from 1 April 2026 to 30 September 2026.
Basis for Opinion
We conducted our audit in accordance with the Standards on Auditing (“SAs”) specified under section 
143(10) of the Companies Act, 2013 (“the Act”). Our responsibilities under those SAs are further described 
in the Auditor’s Responsibilities for the Audit of the Consolidated Financial Results section of our report. 
We are independent of the Group in accordance with the Code of Ethics issued by the Institute of 
Chartered Accountants of India together with the ethical requirements that are relevant to our audit of the 
financial statements under the provisions of the Act, and the Rules thereunder, and we have fulfilled our 
other ethical responsibilities in accordance with these requirements and the Code of Ethics. We believe 
that the audit evidence we have obtained, is sufficient and appropriate to provide a basis for our opinion 
on the consolidated financial results.
Management’s and Board of Directors’/Trustees' Responsibilities for the Consolidated Financial 
Results
These quarterly consolidated financial results as well as the year to date consolidated financial results 
have been prepared on the basis of the consolidated interim financial statements.
The Holding Company’s Management and the Board of Directors are responsible for the preparation and 
presentation of these consolidated financial results that give a true and fair view of the consolidated net 
profit/ loss and other comprehensive income and other financial information of the Group in accordance 
with the recognition and measurement principles laid down in Indian Accounting Standard 34, ‘Interim 
Financial Reporting’ prescribed under Section 133 of the Act read with relevant rules issued thereunder 
and other accounting principles generally accepted in India and in compliance with Regulation 33 of the 
Listing Regulations. The respective Management and Board of Directors/Trustees of the 
companies/entities included in the Group are responsible for maintenance of adequate accounting records

[page 3]
B S R & Co. LLP
Independent Auditor’s Report (Continued)
Tata Consultancy Services Limited
Page 2 of 6
in accordance with the provisions of the Act for safeguarding of the assets of each company/entity and for 
preventing and detecting frauds and other irregularities; selection and application of appropriate 
accounting policies; making judgments and estimates that are reasonable and prudent; and the design, 
implementation and maintenance of adequate internal financial controls, that were operating effectively 
for ensuring accuracy and completeness of the accounting records, relevant to the preparation and 
presentation of the consolidated financial results that give a true and fair view and are free from material 
misstatement, whether due to fraud or error, which have been used for the purpose of preparation of the 
consolidated financial results by the Management and the Board of Directors of the Holding Company, as 
aforesaid.
In preparing the consolidated financial results, the respective Management and the Board of 
Directors/Trustees of the companies/entities included in the Group are responsible for assessing the 
ability of each company/entity to continue as a going concern, disclosing, as applicable, matters related 
to going concern and using the going concern basis of accounting unless the respective Board of 
Directors/Trustees either intends to liquidate the company/entity or to cease operations, or has no realistic 
alternative but to do so. 
The respective Board of Directors/Trustees of the companies/entities included in the Group is responsible 
for overseeing the financial reporting process of each company/entity.
Auditor’s Responsibilities for the Audit of the Consolidated Financial Results
Our objectives are to obtain reasonable assurance about whether the consolidated financial results as a 
whole are free from material misstatement, whether due to fraud or error, and to issue an auditor’s report 
that includes our opinion. Reasonable assurance is a high level of assurance, but is not a guarantee that 
an audit conducted in accordance with SAs will always detect a material misstatement when it exists. 
Misstatements can arise from fraud or error and are considered material if, individually or in the aggregate, 
they could reasonably be expected to influence the economic decisions of users taken on the basis of 
these consolidated financial results.
As part of an audit in accordance with SAs, we exercise professional judgment and maintain professional 
skepticism throughout the audit. We also:
–
Identify and assess the risks of material misstatement of the consolidated financial results, whether 
due to fraud or error, design and perform audit procedures responsive to those risks, and obtain audit 
evidence that is sufficient and appropriate to provide a basis for our opinion. The risk of not detecting 
a material misstatement resulting from fraud is higher than for one resulting from error, as fraud may 
involve collusion, forgery, intentional omissions, misrepresentations, or the override of internal control.
–
Obtain an understanding of internal control relevant to the audit in order to design audit procedures 
that are appropriate in the circumstances, but not for the purpose of expressing an opinion on the 
effectiveness of the Group’s internal control.
–
Evaluate the appropriateness of accounting policies used and the reasonableness of accounting 
estimates and related disclosures in the consolidated financial results made by the Management and 
Board of Directors.
–
Conclude on the appropriateness of the Management’s and Board of Directors’ use of the going 
concern basis of accounting and, based on the audit evidence obtained, whether a material 
uncertainty exists related to events or conditions that may cast significant doubt on the 
appropriateness of this assumption. If we conclude that a material uncertainty exists, we are required 
to draw attention in our auditor’s report to the related disclosures in the consolidated financial results 
or, if such disclosures are inadequate, to modify our opinion. Our conclusions are based on the audit 
evidence obtained up to the date of our auditor’s report. However, future events or conditions may 
cause the Group to cease to continue as a going concern.
–
Evaluate the overall presentation, structure and content of the consolidated financial results, including 
the disclosures, and whether the consolidated financial results represent the underlying transactions 
and events in a manner that achieves fair presentation.

[page 4]
B S R & Co. LLP
Independent Auditor’s Report (Continued)
Tata Consultancy Services Limited
Page 3 of 6
We communicate with those charged with governance of the Holding Company and such other entities 
included in the consolidated financial results of which we are the independent auditors regarding, among 
other matters, the planned scope and timing of the audit and significant audit findings, including any 
significant deficiencies in internal control that we identify during our audit.
We also provide those charged with governance with a statement that we have complied with relevant 
ethical requirements regarding independence, and to communicate with them all relationships and other 
matters that may reasonably be thought to bear on our independence, and where applicable, related 
safeguards.
We also performed procedures in accordance with the circular issued by the Securities and Exchange 
Board of India under Regulation 33(8) of the Listing Regulations, to the extent applicable.
For B S R & Co. LLP
Chartered Accountants
Firm’s Registration No.:101248W/W-100022
Aniruddha Godbole
Partner
Mumbai
Membership No.: 105149
08 October 2026
UDIN:26105149UNGBRP2180
Aniruddha 
Shreekant 
Godbole
Digitally signed by 
Aniruddha Shreekant 
Godbole 
Date: 2026.10.08 14:44:59 
+05'30'

[page 5]
B S R & Co. LLP
Independent Auditor’s Report (Continued)
Tata Consultancy Services Limited
Page 4 of 6
Annexure I
The consolidated financial results include financial results of the Holding Company and the following 
entities:
Sr. 
No.
Name of component
Relationship
1
APTOnline Limited
Subsidiary
2
C-Edge Technologies Limited
Subsidiary
3
Diligenta Limited
Subsidiary
4
MahaOnline Limited
Subsidiary
5
MP Online Limited
Subsidiary
6
Tata America International Corporation
Subsidiary
7
Tata Consultancy Services (Africa) (Proprietary) Limited
Subsidiary
8
Tata Consultancy Services Asia Pacific Pte Ltd.
Subsidiary
9
Tata Consultancy Services Belgium
Subsidiary
10
Tata Consultancy Services Canada Inc.
Subsidiary
11
Tata Consultancy Services Deutschland GmbH
Subsidiary
12
Tata Consultancy Services Netherlands B.V.
Subsidiary
13
Tata Consultancy Services Qatar
Subsidiary
14
Tata Consultancy Services Sverige Aktiebolag
Subsidiary
15
TCS e-Serve International Limited
Subsidiary
16
TCS FNS Pty Limited
Subsidiary
17
TCS Iberoamerica S.A.
Subsidiary
18
Tata Consultancy Services Indonesia, PT
Subsidiary
19
Tata Consultancy Services (China) Co., Ltd.
Subsidiary
20
Tata Consultancy Services (Philippines) Inc.
Subsidiary
21
Tata Consultancy Services (Thailand) Limited
Subsidiary
22
MGDC S.C.
Subsidiary
23
Tata Consultancy Services Argentina S.A.
Subsidiary
24
Tata Consultancy Services De Mexico, S.A. De C.V.
Subsidiary
25
Tata Consultancy Services Do Brasil Ltda.
Subsidiary
26
TCS Inversiones Chile Limitada
Subsidiary

[page 6]
B S R & Co. LLP
Independent Auditor’s Report (Continued)
Tata Consultancy Services Limited
Page 5 of 6
Sr. 
No.
Name of component
Relationship
27
Tata Consultancy Services France
Subsidiary
28
TCS Uruguay S.A.
Subsidiary
29
TCS Solution Center S.A.
(Merged with TCS Uruguay S.A. w.e.f. 01 October 2025)
Subsidiary
30
Tata Consultancy Services De Espana S.A.
Subsidiary
31
Tata Consultancy Services Luxembourg S.A.
Subsidiary
32
Tata Consultancy Services Osterreich GmbH
Subsidiary
33
Tata Consultancy Services Saudi Arabia
Subsidiary
34
Tata Consultancy Services Switzerland Ltd
Subsidiary
35
TCS Business Services GmbH
Subsidiary
36
Tata Consultancy Services Ireland Limited
Subsidiary
37
TCS Technology Solutions GmbH
Subsidiary
38
Tata Consultancy Services Bulgaria EOOD
Subsidiary
39
Tata Consultancy Services Guatemala, S.A.
Subsidiary
40
Tata Consultancy Services UK Limited
Subsidiary
41
Diligenta (Europe) B.V.
Subsidiary
42
TCS Foundation
Subsidiary
43
Tata Consultancy Services Japan, Ltd.
Subsidiary
44
Tata Consultancy Services Malaysia Sdn. Bhd.
Subsidiary
45
Tata Consultancy Services Italia S.R.L.
Subsidiary
46
Tata Consultancy Services (South Africa) (Proprietary) Limited
Subsidiary
47
Tata Consultancy Services Chile S.A.
Subsidiary
48
Tatasolution Center S.A.
Subsidiary
49
Tata Consultancy Services (Portugal), Unipessoal Lda
Subsidiary
50
TCS Financial Solutions Australia Pty Ltd
Subsidiary
51
TRIL Bengaluru Real Estate Five Limited
Subsidiary
52
TRIL Bengaluru Real Estate Six Limited
Subsidiary
53
HyperVault AI Data Center Limited 
(Incorporated w.e.f. 29 October 2025)
Subsidiary

[page 7]
B S R & Co. LLP
Independent Auditor’s Report (Continued)
Tata Consultancy Services Limited
Page 6 of 6
Sr. 
No.
Name of component
Relationship
54
Tata Consultancy Services BT Private Limited 
(Incorporated w.e.f. 16 December 2025)
Subsidiary
55
3-101-951221 S.A.
(Incorporated w.e.f. 15 December 2025)
Subsidiary
56
TCS North America Corporation 
(Incorporated w.e.f. 15 December 2025)
Subsidiary
57
Trident LE LLC
(Incorporated w.e.f. 15 December 2025 and merged with Coastal Cloud 
Holdings, LLC w.e.f. 14 January 2026)
Subsidiary
58
Tata Consultancy Services (North America) Holdings, LLC
(Formerly known as List Engage Midco, LLC)
(Acquired w.e.f. 10 October 2025)
Subsidiary
59
ListEngage, LLC
(Acquired w.e.f. 10 October 2025)
Subsidiary
60
Coastal Cloud Holdings, LLC
(Acquired w.e.f. 14 January 2026)
Subsidiary
61
CC StructureCo, LLC
(Acquired w.e.f. 14 January 2026)
Subsidiary
62
Coastal Cloud Intermediate, LLC
(Acquired w.e.f. 14 January 2026)
Subsidiary
63
Coastal Cloud, LLC
(Acquired w.e.f. 14 January 2026)
Subsidiary
64
Coastal Cloud Canada Corp. 
(Acquired w.e.f. 14 January 2026)
Subsidiary
65
Coastal Cloud NA LLC 
(Formerly known as SCP V-B Blocker III LLC) (Acquired w.e.f. 14 January 
2026)
Subsidiary
66
Tata  Consultancy  Services  Maroc  SARL  AU
(Incorporated w.e.f. 23 January 2026)
Subsidiary
67
Tata Consultancy Services Regional Headquarters 
(Incorporated w.e.f. 18 January 2026)
Subsidiary
68
Tata Sons & Consultancy Services Employees’ Welfare Trust
Trust
69
TCS e-Serve International Limited - Employees’ Welfare Benefit Trust
Trust

[page 8]
Year ended
September 30,
June 30,
September 30,
September 30,
September 30,
March 31,
2026
2026
2025
2026
2025
2026
Revenue from operations
                73,188 
72,275
65,799
1,45,463
1,29,236
2,67,021
Other income
                  1,337 
1,568
867
2,905
2,527
4,402
TOTAL INCOME
                74,525 
73,843
66,666
1,48,368
1,31,763
2,71,423
Expenses
Employee benefit expenses
                41,890 
42,137
38,606
84,027
76,321
1,54,994
Cost of equipment and software licences
                  1,352 
1,354
967
2,706
1,693
4,399
Finance costs
                     252 
273
229
525
424
1,227
Depreciation and amortisation expense
                  1,262 
1,239
1,413
2,501
2,774
5,560
Other expenses
                11,131 
10,228
8,248
21,359
16,369
35,230
TOTAL EXPENSES
                55,887                 55,231                 49,463 
1,11,118                97,581 
2,01,410
PROFIT BEFORE EXCEPTIONAL ITEMS AND TAX
18,638 
18,612 
17,203 
37,250 
34,182 
70,013 
Exceptional items
Re-structuring expenses
                         -                            -                     1,135 
                         -                     1,135                   1,388 
Statutory impact of new Labour Codes
                         -                            -                            -                            -                            -                     2,128 
Settlement of legal claim
                         -                        668 
                         -                        668 
                         -                     1,010 
PROFIT BEFORE TAX 
                18,638                 17,944                 16,068                 36,582                 33,047                 65,487 
Tax expense
Current tax
                  4,723 
4,722
3,969
9,445
8,132
16,388
Deferred tax 
                      (19)                    (198)                      (32)                    (217)                      (35)                    (355)
TOTAL TAX EXPENSE
                  4,704                   4,524                   3,937                   9,228                   8,097                 16,033 
PROFIT FOR THE PERIOD
                13,934                 13,420                 12,131                 27,354                 24,950                 49,454 
OTHER COMPREHENSIVE INCOME (OCI)
Items that will not be reclassified subsequently to profit or 
loss
Remeasurement of defined employee benefit plans
                        82                     (121)                        45                       (39)                        53                       482 
Net change in fair values of investments in equity shares 
carried at fair value through OCI
                        (1)                          2 
                         -                             1                         38                         35 
Income tax on items that will not be reclassified 
subsequently to profit or loss
                      (14)                        24                         (7)                        10                         (9)                    (114)
Items that will be reclassified subsequently to profit or loss
Net change in fair values of investments other than equity 
shares carried at fair value through OCI
                    (693)
                     538                     (354)                    (155)                    (147)                 (1,066)
Net change in intrinsic value of derivatives designated as 
cash flow hedges 
                      (58)                        76                       (20)                        18                       (11)                         (9)
Net change in time value of derivatives designated as cash 
flow hedges
                        23                         (5)                        18                         18                       (22)
                         -  
Exchange differences on translation of financial 
statements of foreign operations
                     315                     (108)
                     649                      207                   1,754                   3,149 
Income tax on items that will be reclassified subsequently 
to profit or loss
                     183                     (153)                        89                         30                         45                       273 
TOTAL OTHER COMPREHENSIVE INCOME / (LOSSES)
                   (163)
                     253                      420                         90                   1,701                   2,750 
TOTAL COMPREHENSIVE INCOME FOR THE PERIOD
                13,771                 13,673                 12,551                 27,444                 26,651                 52,204 
Profit for the period attributable to: 
Shareholders of the Company
                13,884 
13,349
12,075
27,233
24,835
49,210
Non-controlling interests
                        50 
71
56
121
115
244
                13,934                 13,420                 12,131                 27,354                 24,950                 49,454 
Other comprehensive income for the period attributable to:
Shareholders of the Company
                    (189)
                     260                      410                         71                   1,658 
2,711
Non-controlling interests
                        26                         (7)                        10                         19                         43 
39
                   (163)
                     253                      420                         90                   1,701                   2,750 
Total comprehensive income for the period attributable to:
Shareholders of the Company
                13,695                 13,609                 12,485                 27,304                 26,493 
51,921
Non-controlling interests
                        76                         64                         66                      140                      158 
283
                13,771                 13,673                 12,551                 27,444                 26,651                 52,204 
Paid up equity share capital (Face value: `1 per share)
362
362
362
362
362
362
Total reserves (including Non-controlling interests)
1,08,116
(` crore)
Audited Consolidated Interim Statement of Financial Results
Tel: +91 22 6778 9595 e-mail: investor.relations@tcs.com Website: www.tcs.com
CIN: L22210MH1995PLC084781
Registered Office: 9th Floor, Nirmal Building, Nariman Point, Mumbai 400 021
TATA CONSULTANCY SERVICES LIMITED
Three months ended
Six months ended
 
Earnings per equity share:- Basic and diluted (`)
                  38.37                   36.90                   33.37                   75.27                   68.64                 136.01 
Dividend per share (Par value `1 each) 
Interim dividend on equity shares (`)
                  12.00                   12.00                   11.00                   24.00                   22.00                    79.00 
Final dividend on equity shares (`)
                         -                            -                            -                            -                            -                      31.00 
Total dividend on equity shares (`)
                  12.00                   12.00                   11.00                   24.00                   22.00                 110.00 
Total equity dividend percentage 
                  1,200                   1,200                   1,100                   2,400                   2,200                 11,000
```

### INFY · id 50d31412 · 'Results for the quarter and half year ended September 30, 2026 and declaration of interim dividend' · PDF pages total: 195

```
[page 1]
TO ALL STOCK EXCHANGES 
 
BSE LIMITED 
NATIONAL STOCK EXCHANGE OF INDIA LIMITED 
NEW YORK STOCK EXCHANGE 
 
October 23, 2026 
 
Dear Sir/ Madam, 
 
Sub: Outcome of the Board meeting 
 
This has reference to our letter dated September 15, 2026, regarding the captioned subject. The Board, at 
their meeting held on October 22-23, 2026 transacted the following items of business: 
 
Financial Results:  
 
1. Approved the audited consolidated financial results of the Company and its subsidiaries as per 
Indian Accounting Standards (“INDAS”) for the quarter and half year ended September 30, 2026; 
 
2. Approved the audited standalone financial results of the Company as per INDAS for the quarter 
and half year ended September 30, 2026; 
 
3. Approved the audited financial statements of the Company and its subsidiaries as per INDAS and 
International Financial Reporting Standard (“IFRS”) for the quarter and half year ended September 
30, 2026; 
 
Dividend: 
 
4. Declared an interim dividend of ₹ 26/- per equity share, fixed November 3, 2026 as a record date 
and November 11, 2026 as a payout date.  
 
Stock grants: 
 
5. Based on the recommendations of the Nomination and Remuneration Committee, the Board 
approved the grant of 9,640 Restricted Stock Units (‘RSUs’) under the 2015 Incentive 
Compensation Plan (’2015 Plan’) to eligible employees. The grants made under the 2015 Plan 
would vest equally over a period of three years. The RSUs will be granted w.e.f., November 1, 2026 
and the exercise price will be equal to the par value of the share.

[page 2]
Allotment of equity shares: 
6. Allotted 15,578 equity shares of face value of ₹ 5/- each, pursuant to exercise of Restricted Stock
Units by eligible employees as hereunder:
•
2,841 equity shares under the 2015 Incentive Compensation Plan;
•
12,737 equity shares under the Infosys Expanded Stock Ownership Program 2019.
Consequently, effective from October 23, 2026, the issued and subscribed share capital of the 
Company stands increased to ₹ 20,29,14,60,780/- divided into 4,05,82,92,156 equity shares of ₹5/- 
each.  
The Board meeting was held on October 22 and 23, 2026. The Board meeting on October 23, 
2026 commenced at 12.27 PM IST and concluded at 4.00 PM IST.  
We are hereby enclosing herewith the financial results, press releases, and other annexures mentioned 
above. The same will also be made available on the Company’s website www.infosys.com.  
This is for your information and records. 
Yours sincerely, 
For Infosys Limited 
Manikantha A.G.S. 
Company Secretary 
Membership No: A21918 
Anur Gurugopala 
Raju 
Suryanarayana 
Manikantha
Digitally signed by Anur 
Gurugopala Raju 
Suryanarayana Manikantha 
Date: 2026.10.23 16:04:26 
+05'30'

[page 3]
Fact Sheet
Consolidated Financial Data - Second Quarter, Fiscal 2023
 
www.infosys.com 
Page 1 of 4                              
 
Fact Sheet 
Consolidated Financial Data - Second Quarter, Fiscal 2027 
1.2% QoQ 
1.5% YoY 
CC Growth# 
 
21.0% 
Operating  
Margin 
 
8.7% YoY 
EPS Increase 
(₹ terms) 
 
$5.2 Bn 
Large Deal TCV 
(62% Net New) 
 
$0.93 Bn 
Free Cash Flow 
(FCF) 
 
10.5% 
AI as a % of 
Revenue 
Revenue Growth- Q2 27 
Reported
CC
1.2%
1.2%
1.3%
1.5%
YoY growth (%)
QoQ growth (%)
 
Revenues by Business Segments 
(in %) 
Sep 30, 2026
Jun 30, 2026
Sep 30, 2025
Reported
CC
Financial Services
28.0
                     
27.9
                     
27.7
                     
2.3
                        
2.1
                        
Manufacturing
16.0
                     
15.9
                     
16.5
                     
(1.4)
                      
(0.7)
                      
Energy, Utilities, Resources & Services
14.2
                     
13.4
                     
13.4
                     
7.4
                        
7.3
                        
Retail
11.5
                     
12.8
                     
12.7
                     
(8.1)
                      
(7.7)
                      
Communication
12.5
                     
12.0
                     
12.1
                     
4.4
                        
4.1
                        
Hi-Tech
6.8
                        
7.7
                        
8.3
                        
(17.5)
                    
(17.3)
                    
Life Sciences
8.4
                        
8.0
                        
6.4
                        
32.5
                     
32.5
                     
Others
2.6
                        
2.3
                        
2.9
                        
(7.4)
                      
(4.7)
                      
Total
100.0
                   
100.0
                   
100.0
                   
1.3
                       
1.5
                       
Quarter ended
YoY Growth
 
Revenues by Client Geography 
(in %) 
Sep 30, 2026
Jun 30, 2026
Sep 30, 2025
Reported
CC
54.6
                     
56.4
                     
56.3
                     
(1.6)
                      
(1.5)
                      
32.5
                     
32.1
                     
31.7
                     
3.9
                        
4.6
                        
10.1
                     
9.0
                        
8.9
                        
15.1
                     
10.9
                     
2.8
                        
2.5
                        
3.1
                        
(10.5)
                    
(3.5)
                      
100.0
                   
100.0
                   
100.0
                   
1.3
                       
1.5
                       
India
Total
Quarter ended
YoY Growth
North America
Europe
Rest of the world
 
Client Data 
 
Sep 30, 2026
Jun 30, 2026
Sep 30, 2025
2,060
                   
2,027
                   
1,896
                   
142
                       
155
                       
118
                       
1,048
                   
1,026
                   
1,012
                   
322
                       
333
                       
322
                       
87
                         
85
                         
85
                         
42
                         
41
                         
41
                         
12.2%
12.1%
13.0%
19.8%
19.9%
20.7%
34.0%
33.9%
35.2%
64
63
                         
71
                         
Top 5 clients
Top 10 clients
Top 25 clients
Days sales outstanding^
Number of clients
Quarter ended
Active
Added during the period (gross)
Number of Million dollar clients^
1 Million dollar +
10 Million dollar +
50 Million dollar +
100 Million dollar +
Client contribution to revenues
 
^LTM (Last twelve months) Revenues 
#Revenue growth in reported currency includes the impact of currency fluctuations. Additionally, we calculate constant currency (CC) growth by comparing current 
period revenues in respective local currencies converted to US $ using prior period exchange rates and comparing the same to our prior period reported revenues.

[page 4]
Fact Sheet
Consolidated Financial Data - Second Quarter, Fiscal 2023
 
www.infosys.com 
Page 2 of 4                              
 
Fact Sheet 
Consolidated Financial Data - Second Quarter, Fiscal 2027 
Effort & Utilization – Consolidated IT Services 
 
 
 
 
 
(in %) 
Sep 30, 2026
Jun 30, 2026
Sep 30, 2025
22.6
                     
22.8
                     
23.2
                     
77.4
                     
77.2
                     
76.8
                     
81.9
                     
82.1
                     
82.2
                     
85.4
                     
84.9
                     
85.1
                     
Including trainees
Excluding trainees
Quarter ended
Effort 
Onsite
Offshore
Utilization
 
 
Employee Metrics 
(Nos.) 
Sep 30, 2026
Jun 30, 2026
Sep 30, 2025
332,542
               
328,062
               
331,991
               
314,508
               
310,039
               
314,500
               
18,034
                 
18,023
                 
17,491
                 
12.7%
13.0%
14.3%
39.8%
39.6%
39.5%
Voluntary Attrition % (LTM - IT Services)
% of Women Employees
Quarter ended
Total employees
S/W professionals
Sales & Support
 
 
Cash Metrics 
In US $ million 
Sep 30, 2026
Jun 30, 2026
Sep 30, 2025
928
                       
955
                       
1,101
                   
4,720
                   
3,916
                   
6,173
                   
Quarter ended
FCF(1)
Consolidated cash and investments(2)
 
 
In ₹ crore 
Sep 30, 2026
Jun 30, 2026
Sep 30, 2025
8,898
                   
9,051
                   
9,677
                   
45,232
                 
37,065
                 
54,809
                 
Consolidated cash and investments(2)
FCF(1)
Quarter ended
 
 
(1) Free cash flow is defined as net cash provided by operating activities less capital expenditure as per the consolidated statement of cash flows prepared under IFRS 
(non-IFRS measure) 
(2) Consolidated cash and investments comprise of cash and cash equivalents, current and non-current investments excluding investments in equity and preference 
shares, unquoted compulsorily convertible debentures and others

[page 5]
Fact Sheet
Consolidated Financial Data - Second Quarter, Fiscal 2023
 
www.infosys.com 
Page 3 of 4                              
 
Fact Sheet 
Consolidated Financial Data - Second Quarter, Fiscal 2027 
Consolidated Statement of Comprehensive Income for three months ended, 
(Extracted from IFRS Financial Statement) 
In US $ million, except per equity share data 
Particulars
Sep 30, 2026
Sep 30, 2025
Growth %
YoY
Jun 30, 2026
Growth %
QoQ
5,145
                   
5,076
                   
1.3%
5,082
                   
1.2%
3,547
                   
3,516
                   
0.9%
3,482
                   
1.9%
1,598
                   
1,560
                   
2.4%
1,600
                   
-0.1%
260
                       
254
                       
2.4%
270
                       
-3.7%
259
                       
241
                       
7.5%
258
                       
0.4%
519
                      
495
                      
4.8%
528
                      
-1.7%
1,079
                   
1,065
                   
1.3%
1,072
                   
0.7%
21.0
                     
21.0
                     
0.0%
21.1
                     
-0.1%
77
                         
100
                       
-23.0%
91
                         
-15.4%
1,156
                   
1,165
                   
-0.8%
1,163
                   
-0.6%
337
                       
325
                       
3.7%
343
                       
-1.7%
817
                      
839
                      
-2.5%
819
                      
-0.2%
0.20
                     
0.20
                     
-0.3%
0.20
                     
-0.3%
0.20
                     
0.20
                     
-0.2%
0.20
                     
-0.3%
0.27
                     
0.26
                     
13.0%
-
                       
-
                       
Revenues
Cost of sales
Gross profit
Operating expenses:
Selling and marketing expenses
Administrative expenses
Total operating expenses
Operating profit
Other income, net of finance cost
Profit before income taxes
Operating margin %
Net profit (after non-controlling interests)
Basic EPS ($)
Diluted EPS ($)
Dividend per share ($)(1)
Income tax expense
 
 
(1) Dividend Growth (%) calculated in INR terms. 
 
Consolidated Statement of Comprehensive Income for six months ended, 
(Extracted from IFRS Financial Statement) 
In US $ million, except per equity share data 
Particulars
Sep 30, 2026
Sep 30, 2025
Growth % 
10,227
                
10,018
                
2.1%
7,028
                   
6,933
                   
1.4%
3,199
                   
3,085
                   
3.7%
531
                       
512
                       
3.7%
517
                       
480
                       
7.7%
1,048
                   
992
                      
5.6%
2,151
                   
2,093
                   
2.8%
21.0
                     
20.9
                     
0.1%
168
                       
210
                       
-20.0%
2,319
                   
2,303
                   
0.7%
680
                       
654
                       
4.0%
1,637
                   
1,647
                   
-0.6%
0.40
                     
0.40
                     
1.7%
0.40
                     
0.40
                     
1.7%
0.27
                     
0.26
                     
13.0%
Operating expenses:
Selling and marketing expenses
Administrative expenses
Dividend per share ($)(1)
Total operating expenses
Revenues
Cost of sales
Gross profit
Operating profit
Other income, net of finance cost
Profit before income taxes
Income tax expense
Net profit (after non-controlling interests)
Operating margin %
Basic EPS ($)
Diluted EPS ($)
 
 
(1) Dividend Growth (%) calculated in INR terms.

[page 6]
Fact Sheet
Consolidated Financial Data - Second Quarter, Fiscal 2023
 
www.infosys.com 
Page 4 of 4                              
 
Fact Sheet 
Consolidated Financial Data - Second Quarter, Fiscal 2027 
Consolidated Statement of Comprehensive Income for three months ended, 
(Extracted from IFRS Financial Statement) 
 In ₹ crore, except per equity share data 
Particulars
Sep 30, 2026
Sep 30, 2025
Growth %
YoY
Jun 30, 2026
Growth %
QoQ
49,244
                
44,490
                
10.7%
48,211
                
2.1%
33,943
                 
30,800
                 
10.2%
33,033
                 
2.8%
15,301
                
13,690
                
11.8%
15,178
                
0.8%
2,489
                   
2,224
                   
11.9%
2,568
                   
-3.1%
2,482
                   
2,113
                   
17.5%
2,447
                   
1.4%
4,971
                   
4,337
                   
14.6%
5,015
                   
-0.9%
10,330
                
9,353
                   
10.4%
10,163
                
1.6%
21.0
                     
21.0
                     
0.0%
21.1
                     
-0.1%
733
                       
876
                       
-16.3%
865
                       
-15.3%
11,063
                
10,229
                
8.2%
11,028
                
0.3%
3,225
                   
2,854
                   
13.0%
3,253
                   
-0.9%
7,823
                   
7,364
                   
6.2%
7,769
                   
0.7%
19.32
                   
17.76
                   
8.7%
19.19
                   
0.6%
19.30
                   
17.74
                   
8.8%
19.17
                   
0.7%
26.00
                   
23.00
                   
13.0%
-
                       
-
                       
Profit before income taxes
Income tax expense
Net profit (after non-controlling interests)
Dividend per share (₹)
Administrative expenses
Total operating expenses
Operating profit
Operating margin %
Other income, net of finance cost
Revenues
Cost of sales
Gross profit
Operating expenses:
Selling and marketing expenses
Diluted EPS (₹)
Basic EPS (₹)
 
 
 
Consolidated Statement of Comprehensive Income for six months ended, 
(Extracted from IFRS Financial Statement) 
     In ₹ crore, except per equity share data 
Particulars
Sep 30, 2026
Sep 30, 2025
Growth % 
97,454
                
86,769
                
12.3%
66,975
                 
60,025
                 
11.6%
30,479
                
26,744
                
14.0%
5,057
                   
4,431
                   
14.1%
4,928
                   
4,156
                   
18.6%
9,985
                   
8,587
                   
16.3%
20,494
                
18,157
                
12.9%
21.0
                     
20.9
                     
0.1%
1,597
                   
1,813
                   
-11.9%
22,091
                
19,970
                
10.6%
6,478
                   
5,670
                   
14.3%
15,592
                
14,285
                
9.1%
38.51
                   
34.47
                   
11.7%
38.46
                   
34.41
                   
11.8%
26.00
                   
23.00
                   
13.0%
Operating margin %
Cost of sales
Gross profit
Operating expenses:
Selling and marketing expenses
Administrative expenses
Total operating expenses
Operating Profit
Revenues
Dividend per share (₹)
Basic EPS (₹)
Diluted EPS (₹)
Other income, net of finance cost
Profit before income taxes
Income tax expense
Net profit (after non-controlling interests)
 
 
 
 
As the quarter and six months ended figures are taken from the source and rounded to the nearest digits, the quarter figures in this statement added up to the figures 
reported for the previous quarter might not always add up to the six month ended figures reported in this statement.

[page 7]
Deloitte 
Haskins & Sells LLP 
Chartered Accountants 
Prestige Trade Tower, Level 19 
46, Palace Road, High Grounds 
Bengaluru-560 001 
Karnataka, India 
Tel: +91 80 6188 6000 
Fax: +91 80 6188 6011 
INDEPENDENT AUDITOR'S REPORT ON AUDIT OF QUARTERLY AND HALF YEARLY CONSOLIDATED 
FINANCIAL RESULTS 
TO THE BOARD OF DIRECTORS OF INFOSYS LIMITED 
Opinion 
We have audited the accompanying statement of Consolidated Financial Results of INFOSYS LIMITED 
(the "Company") and its subsidiaries (the Company and its subsidiaries together referred to as the 
"Group") for the quarter and half year ended September 30, 2026 (the "Statement"), being submitted 
by the Company pursuant to the requirements of Regulation 33 of the SEBI (Listing Obligations and 
Disclosure Requirements) Regulations, 2015, as amended (the "LODR Regulations"). 
In our opinion and to the best of our information and according to the explanations given to us, the 
Statement: 
(i) includes the financial results of the subsidiaries as given in the Annexure to this report; 
(ii) is presented in accordance with the requirements of Regulation 33 of the LODR Regu lations; and 
(iii) gives a true and fair view in conformity with the recognition and measurement principles laid down 
in the Indian Accounting Standard 34 "Interim Financial Reporting" (''Ind AS 34") prescribed under 
section 133 of the Companies Act, 2013 (the "Act") read with relevant rules issued thereunder 
and other accounting principles generally accepted in India of the consolidated net profit and 
consolidated other comprehensive income and other financial information of the Group for the 
quarter and half year ended September 30, 2026. 
Basis for Opinion 
We conducted our audit in accordance with the Standards on Auditing ("SA"s) specified under Section 
143(10) of the Act. Our responsibilities under those Standards are further described in Auditor's 
Responsibilities for audit of the consolidated financial results section of our report. We are independent 
of the Group in accordance with the Code of Ethics issued by the Institute of Chartered Accountants 
of India ("ICAI") together with the ethical requirements that are relevant to our audit of the 
consolidated financial results for the quarter and half year ended September 30, 2026 under the 
provisions of the Act and the Rules thereunder, and we have fulfilled our other ethical responsibilities 
in accordance with these requirements and the ICAI's Code of Ethics. We believe that the audit 
evidence obtained by us is sufficient and appropriate to provide a basis for our audit opinion. 
Management's and Board of Directors' Responsibilities for the Statement 
The Statement, which includes the Consolidated Financial Results is the responsibility of the 
Company's Board of Directors and has been approved by them for the issuance. The Statement has 
been compiled from the related audited interim condensed consolidated financial statements for the 
three months and six months ended September 30, 2026. This responsibility includes the preparation 
and presentation of the Statement that give a true and fair view of the consolidated net profit and 
consolidated other comprehensive income and other financial information of the Group in accordance 
with the recognition and measurement principles laid down in the Ind AS 34, prescribed under Section 
133 of the Act, read with relevant rules issued thereunder and other accounting principles generally 
accepted in India and in compliance with Regulation 33 of the LODR Regulations. 
Regd. Office: One International Center, Tower 3, 31st floor, Senapati Bapat Marg, Elphinstone Road (West), Mumbai-400 013, Maharashtra, India. 
Deloitte Haskins & Sells LLP is registered with Limited Liability having LLP identification No: AAB-8737

[page 8]
Deloitte 
Haskins & Sells LLP 
The respective Board of Directors of the companies included in the Group are responsible for 
maintenance of adequate accounting records in accordance with the provisions of the Act for 
safeguarding the assets of the Group and for preventing and detecting frauds and other irregularities; 
selection and application of appropriate accounting policies; making judgments and estimates that are 
reasonable and prudent; and the design, implementation and maintenance of adequate internal 
financial controls, that were operating effectively for ensuring the accuracy and completeness of the 
accounting records, relevant to the preparation and presentation of the respective financial results 
that give a true and fair view and are free from material misstatement, whether due to fraud or error, 
which have been used for the purpose of preparation of this Statement by the Directors of the 
Company, as aforesaid. 
In preparing the Consolidated Financial Results, the respective Board of Directors of the companies 
included in the Group are responsible for assessing the ability of the respective entities to continue as 
a going concern, disclosing, as applicable, matters related to going concern and using the going 
concern basis of accounting unless the respective Board of Directors either intends to liquidate their 
respective entities or to cease operations, or has no realistic alternative but to do so. 
The respective Board of Directors of the companies included in the Group are responsible for 
overseeing the financial reporting process of the Group. 
Auditor's Responsibilities for audit of the Consolidated Financial Results for the quarter and half year 
ended September 30, 2026 
Our objectives are to obtain reasonable assurance about whether the Consolidated Financial Results 
for the quarter and half year ended September 30, 2026, as a whole are free from material 
misstatement, whether due to fraud or error, and to issue an auditor's report that includes our opinion. 
Reasonable assurance is a high level of assurance but is not a guarantee that an audit conducted in 
accordance with SAs will always detect a material misstatement when it exists. Misstatements can 
arise from fraud or error and are considered material if, individually or in the aggregate, they could 
reasonably be expected to influence the economic decisions of users taken on the basis of these 
Consolidated Financial Results. 
As part of an audit in accordance with SAs, we exercise professional judgment and maintain 
professional skepticism throughout the audit. We also: 
• Identify and assess the risks of material misstatement of the Statement, whether due to fraud or 
error, design and perform audit procedures responsive to those risks, and obtain audit evidence 
that is sufficient and appropriate to provide a basis for our opinion. The risk of not detecting a 
material misstatement resulting from fraud is higher than for one resulting from error, as fraud 
may involve collusion, forgery, intentional omissions, misrepresentations, or the override of internal 
control. 
• 
Obtain an understanding of internal control relevant to the audit in order to design audit procedures 
that are appropriate in the circumstances, but not for the purpose of expressing an opinion on the 
effectiveness of such controls. 
• Evaluate the appropriateness of accounting policies used and the reasonableness of accounting 
estimates made by the Board of Directors. 
• 
Evaluate the appropriateness and reasonableness of disclosures made by the Board of Directors in 
terms of the requirements specified under Regulation 33 of the LODR Regulations.
```
