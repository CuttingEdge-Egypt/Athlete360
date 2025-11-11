import requests
from bs4 import BeautifulSoup
import time
import re
import random
import json
from urllib.parse import urljoin, urlparse
import logging
import cloudscraper
from typing import List, Dict, Optional, Callable, Any
from datetime import datetime

class TaekwondoScraper:
    """
    A web scraper for extracting athlete data from World Taekwondo rankings
    """
    
    def __init__(self):
        self.base_url = "https://worldtkd.simplycompete.com"
        self.api_url = "https://worldtkd.simplycompete.com/rankingsV2"
        
        # Create cloudscraper session for bypassing Cloudflare
        self.session = cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'windows',
                'desktop': True
            }
        )
        
        # Additional headers for JSON API requests
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Cache-Control': 'max-age=0'
        })
        
        # Configuration parameters
        self.ranking_category = None
        self.sub_category = None
        self.weight_division = None
        self.athlete_filter = None
        self.country_filter = None
        self.month = None
        self.year = None
        self.max_results = 100
        self.delay = 2
        
        # UUID mappings for API parameters - corrected based on actual website structure
        # rankingTypeId is the Ranking Category
        self.ranking_type_mappings = {
            "World Kyorugi Rankings": "11ef3b4e-05ce-797c-aca4-064aef8133e9",
            "Olympic Kyorugi Rankings": "11ef3916-58d3-484e-8999-023374a4dcc1"
        }
        
        # subCategory1 is the first Sub Category
        self.sub_category_mappings = {
            "World Senior Division": "11ef3b4e-3058-36ed-aca4-064aef8133e9",
            "Olympic Senior Division": "11ef3918-30a6-2db9-8999-023374a4dcc1"
        }
        
        # rankingCategoryId is actually the Weight Division
        # Weight divisions for Olympic Senior Division
        self.olympic_weight_mappings = {
            "M-58 kg": "11ef3918-68c6-28dd-8999-023374a4dcc1",
            "M-68 kg": "11ef3918-77ec-f1ac-8999-023374a4dcc1",
            "M-80 kg": "11ef3918-85ab-ed16-8999-023374a4dcc1",
            "M+80 kg": "11ef3918-8f75-6b58-8999-023374a4dcc1",
            "W-49 kg": "11ef3918-980a-131b-8999-023374a4dcc1",
            "W-57 kg": "11ef3918-a158-6dec-8999-023374a4dcc1",
            "W-67 kg": "11ef3918-ae9a-e651-8999-023374a4dcc1",
            "W+67 kg": "11ef3918-b888-404a-8999-023374a4dcc1"
        }
        
        # Weight divisions for World Senior Division
        self.world_weight_mappings = {
            "M-54 kg": "11ef3b4e-697f-68de-aca4-064aef8133e9",
            "M-58 kg": "11ef3b4e-742c-423f-aca4-064aef8133e9", 
            "M-63 kg": "11ef3b4e-7a90-4e60-aca4-064aef8133e9",
            "M-68 kg": "11ef3b4e-8213-8622-aca4-064aef8133e9",
            "M-74 kg": "11ef3b4e-8bd3-6773-aca4-064aef8133e9",
            "M-80 kg": "11ef3b4e-9554-6b04-aca4-064aef8133e9",
            "M-87 kg": "11ef3b4e-9bce-7025-aca4-064aef8133e9",
            "M+87 kg": "11ef3b4e-a2e2-e086-aca4-064aef8133e9",
            "W-46 kg": "11ef3b4e-ac1a-57f7-aca4-064aef8133e9",
            "W-49 kg": "11ef3b4e-b284-3078-aca4-064aef8133e9",
            "W-53 kg": "11ef3b4e-bab7-cc79-aca4-064aef8133e9",
            "W-57 kg": "11ef3b4e-c22c-d36a-aca4-064aef8133e9",
            "W-62 kg": "11ef3b4e-d233-74db-aca4-064aef8133e9",
            "W-67 kg": "11ef3b4e-da84-f91c-aca4-064aef8133e9",
            "W-73 kg": "11ef3b4e-e2f5-ec3d-aca4-064aef8133e9",
            "W+73 kg": "11ef3b4e-edb8-e5af-aca4-064aef8133e9"
        }
        
        # Real country UUIDs from the website (updated from JSON response)
        self.country_mappings = {
            "Afghanistan": "11e6eef3-fe41-889a-92b4-12f817a4f090",
            "Aland Islands": "11e6eef3-fe7a-72c5-92b4-12f817a4f090",
            "Albania": "11e6eef3-fe41-afab-92b4-12f817a4f090",
            "Algeria": "11e6eef3-fe41-d6bc-92b4-12f817a4f090",
            "American Samoa": "11e6eef3-fe41-fdcd-92b4-12f817a4f090",
            "Andorra": "11e6eef3-fe42-4bee-92b4-12f817a4f090",
            "Angola": "11e6eef3-fe42-72ff-92b4-12f817a4f090",
            "Anguilla": "11e6eef3-fe42-9a10-92b4-12f817a4f090",
            "Antarctica": "11e6eef3-fe42-e831-92b4-12f817a4f090",
            "Antigua and Barbuda": "11e6eef3-fe43-0f42-92b4-12f817a4f090",
            "Argentina": "11e6eef3-fe43-3653-92b4-12f817a4f090",
            "Armenia": "11e6eef3-fe43-8474-92b4-12f817a4f090",
            "Aruba": "11e6eef3-fe43-ab85-92b4-12f817a4f090",
            "Australia": "11e6eef3-fe3b-6e01-92b4-12f817a4f090",
            "Austria": "11e6eef3-fe43-f9a6-92b4-12f817a4f090",
            "Azerbaijan": "11e6eef3-fe44-20b7-92b4-12f817a4f090",
            "Bahamas": "11e6eef3-fe44-6ed8-92b4-12f817a4f090",
            "Bahrain": "11e6eef3-fe44-bcf9-92b4-12f817a4f090",
            "Baker & Howland Island": "11e6eef3-fe44-e40a-92b4-12f817a4f090",
            "Bangladesh": "11e6eef3-fe45-322b-92b4-12f817a4f090",
            "Barbados": "11e6eef3-fe45-593c-92b4-12f817a4f090",
            "Belarus": "11e6eef3-fe45-a75d-92b4-12f817a4f090",
            "Belgium": "11e6eef3-fe3b-bc22-92b4-12f817a4f090",
            "Belize": "11e6eef3-fe3c-0a43-92b4-12f817a4f090",
            "Benin": "11e6eef3-fe45-ce6e-92b4-12f817a4f090",
            "Bermuda": "11e6eef3-fe46-1c8f-92b4-12f817a4f090",
            "Bhutan": "11e6eef3-fe46-43a0-92b4-12f817a4f090",
            "Bolivia": "11e6eef3-fe46-91c1-92b4-12f817a4f090",
            "Bosnia and Herzegovina": "11e6eef3-fe46-b8d2-92b4-12f817a4f090",
            "Botswana": "11e6eef3-fe47-06f3-92b4-12f817a4f090",
            "Bouvet island": "11e6eef3-fe47-2e04-92b4-12f817a4f090",
            "Brazil": "11e6eef3-fe3c-3154-92b4-12f817a4f090",
            "British Indian Ocean Territory": "11e6eef3-fe47-7c25-92b4-12f817a4f090",
            "Brunei Darussalam": "11e6eef3-fe47-a336-92b4-12f817a4f090",
            "Bulgaria": "11e6eef3-fe47-f157-92b4-12f817a4f090",
            "Burkina Faso": "11e6eef3-fe48-1868-92b4-12f817a4f090",
            "Burundi": "11e6eef3-fe48-3f79-92b4-12f817a4f090",
            "Cambodia": "11e6eef3-fe48-8d9a-92b4-12f817a4f090",
            "Cameroon": "11e6eef3-fe48-b4ab-92b4-12f817a4f090",
            "Canada": "11e6eef3-fe3c-7f75-92b4-12f817a4f090",
            "Cape Verde": "11e6eef3-fe49-02cc-92b4-12f817a4f090",
            "Cayman Islands": "11e6eef3-fe49-29dd-92b4-12f817a4f090",
            "Central African Republic": "11e6eef3-fe49-50ee-92b4-12f817a4f090",
            "Chad": "11e6eef3-fe49-9f0f-92b4-12f817a4f090",
            "Chile": "11e6eef3-fe49-c620-92b4-12f817a4f090",
            "Chinese Taipei": "11e6eef3-fe74-3117-92b4-12f817a4f090",
            "Christmas Island": "11e6eef3-fe4a-1441-92b4-12f817a4f090",
            "Cocos Islands": "11e6eef3-fe4a-6262-92b4-12f817a4f090",
            "Colombia": "11e6eef3-fe4a-b083-92b4-12f817a4f090",
            "Comoros": "11e6eef3-fe4a-d794-92b4-12f817a4f090",
            "Congo": "11e6eef3-fe4b-25b5-92b4-12f817a4f090",
            "Cook Islands": "11e6eef3-fe4b-9ae7-92b4-12f817a4f090",
            "Costa Rica": "11e6eef3-fe4b-e908-92b4-12f817a4f090",
            "Cote D'ivoire": "11e6eef3-fe4c-1019-92b4-12f817a4f090",
            "Croatia": "11e6eef3-fe4c-5e3a-92b4-12f817a4f090",
            "Cuba": "11e6eef3-fe3c-f4a7-92b4-12f817a4f090",
            "Curacao": "11e6eef3-fe7a-99d6-92b4-12f817a4f090",
            "Cyprus": "11e6eef3-fe4c-854b-92b4-12f817a4f090",
            "Czech Republic": "11e6eef3-fe4c-d36c-92b4-12f817a4f090",
            "Democratic Republic Of The Congo": "11e6eef3-fe4b-73d6-92b4-12f817a4f090",
            "Denmark": "11e6eef3-fe4d-218d-92b4-12f817a4f090",
            "Djibouti": "11e6eef3-fe4d-489e-92b4-12f817a4f090",
            "Dominican Republic": "11e6eef3-fe4d-e4e0-92b4-12f817a4f090",
            "Dominique": "11e6eef3-fe4d-96bf-92b4-12f817a4f090",
            "Ecuador": "11e6eef3-fe4e-8122-92b4-12f817a4f090",
            "Egypt": "11e6eef3-fe4e-a833-92b4-12f817a4f090",
            "El Salvador": "11e6eef3-fe4e-f654-92b4-12f817a4f090",
            "Equatorial Guinea": "11e6eef3-fe4f-4475-92b4-12f817a4f090",
            "Eritrea": "11e6eef3-fe4f-6b86-92b4-12f817a4f090",
            "Estonia": "11e6eef3-fe4f-b9a7-92b4-12f817a4f090",
            "Eswatini": "11e6eef3-fe73-bbe5-92b4-12f817a4f090",
            "Ethiopia": "11e6eef3-fe50-07c8-92b4-12f817a4f090",
            "Falkland Islands (Malvinas)": "11e6eef3-fe50-2ed9-92b4-12f817a4f090",
            "Faroe Islands": "11e6eef3-fe50-7cfa-92b4-12f817a4f090",
            "Federated States Of Micronesia": "11e6eef3-fe66-763b-92b4-12f817a4f090",
            "Fiji": "11e6eef3-fe50-cb1b-92b4-12f817a4f090",
            "Finland": "11e6eef3-fe50-f22c-92b4-12f817a4f090",
            "France": "11e6eef3-fe3d-42c8-92b4-12f817a4f090",
            "France, Metropolitan": "11e6eef3-fe51-404d-92b4-12f817a4f090",
            "French Guiana": "11e6eef3-fe51-8e6e-92b4-12f817a4f090",
            "French Polynesia": "11e6eef3-fe51-dc8f-92b4-12f817a4f090",
            "French Southern Territories": "11e6eef3-fe52-2ab0-92b4-12f817a4f090",
            "Gabon": "11e6eef3-fe52-51c1-92b4-12f817a4f090",
            "Gambia": "11e6eef3-fe52-9fe2-92b4-12f817a4f090",
            "Georgia": "11e6eef3-fe52-ee03-92b4-12f817a4f090",
            "Germany": "11e6eef3-fe3d-b7f9-92b4-12f817a4f090",
            "Ghana": "11e6eef3-fe53-3c24-92b4-12f817a4f090",
            "Gibraltar": "11e6eef3-fe53-8a45-92b4-12f817a4f090",
            "Great Britain": "11e6eef3-fe41-3a79-92b4-12f817a4f090",
            "Greece": "11e6eef3-fe53-d866-92b4-12f817a4f090",
            "Greenland": "11e6eef3-fe53-ff77-92b4-12f817a4f090",
            "Grenada": "11e6eef3-fe54-4d98-92b4-12f817a4f090",
            "Guadeloupe": "11e6eef3-fe54-9bb9-92b4-12f817a4f090",
            "Guam": "11e6eef3-fe54-c2ca-92b4-12f817a4f090",
            "Guatemala": "11e6eef3-fe55-10eb-92b4-12f817a4f090",
            "Guernsey": "11e6eef3-fe55-5f0c-92b4-12f817a4f090",
            "Guinea": "11e6eef3-fe55-861d-92b4-12f817a4f090",
            "Guinea-bissau": "11e6eef3-fe55-d43e-92b4-12f817a4f090",
            "Guyana": "11e6eef3-fe55-fb4f-92b4-12f817a4f090",
            "Haiti": "11e6eef3-fe56-4970-92b4-12f817a4f090",
            "Heard and Mc Donald Islands": "11e6eef3-fe56-7081-92b4-12f817a4f090",
            "Honduras": "11e6eef3-fe56-bea2-92b4-12f817a4f090",
            "Hong Kong, the People’s Republic of China": "11e6eef3-fe56-e5b3-92b4-12f817a4f090",
            "Hungary": "11e6eef3-fe57-0cc4-92b4-12f817a4f090",
            "Iceland": "11e6eef3-fe57-5ae5-92b4-12f817a4f090",
            "India": "11e6eef3-fe3d-df0a-92b4-12f817a4f090",
            "Indonesia": "11e6eef3-fe3e-2d2b-92b4-12f817a4f090",
            "Iraq": "11e6eef3-fe57-d017-92b4-12f817a4f090",
            "Ireland": "11e6eef3-fe58-1e38-92b4-12f817a4f090",
            "Islamic Republic Of Iran": "11e6eef3-fe57-a906-92b4-12f817a4f090",
            "Isle of Man": "11e6eef3-fe64-ef95-92b4-12f817a4f090",
            "Israel": "11e6eef3-fe58-4549-92b4-12f817a4f090",
            "Italy": "11e6eef3-fe58-936a-92b4-12f817a4f090",
            "Jamaica": "11e6eef3-fe58-e18b-92b4-12f817a4f090",
            "Japan": "11e6eef3-fe3e-7b4c-92b4-12f817a4f090",
            "Jersey": "11e6eef3-fe59-089c-92b4-12f817a4f090",
            "Jordan": "11e6eef3-fe59-56bd-92b4-12f817a4f090",
            "Kazakhstan": "11e6eef3-fe59-a4de-92b4-12f817a4f090",
            "Kenya": "11e6eef3-fe5e-fc0f-92b4-12f817a4f090",
            "Kiribati": "11e6eef3-fe5f-7140-92b4-12f817a4f090",
            "Korea, North": "11e6eef3-fe5f-e672-92b4-12f817a4f090",
            "Kosovo": "11e6eef3-fe3a-839f-92b4-12f817a4f090",
            "Kuwait": "11e6eef3-fe60-3493-92b4-12f817a4f090",
            "Kyrgyzstan": "11e6eef3-fe60-82b4-92b4-12f817a4f090",
            "Lao People's Democratic Republic": "11e6eef3-fe60-a9c5-92b4-12f817a4f090",
            "Latvia": "11e6eef3-fe60-f7e6-92b4-12f817a4f090",
            "Lebanon": "11e6eef3-fe61-1ef7-92b4-12f817a4f090",
            "Lesotho": "11e6eef3-fe61-6d18-92b4-12f817a4f090",
            "Liberia": "11e6eef3-fe61-bb39-92b4-12f817a4f090",
            "Libya": "11e6eef3-fe61-e24a-92b4-12f817a4f090",
            "Liechtenstein": "11e6eef3-fe62-306b-92b4-12f817a4f090",
            "Lithuania": "11e6eef3-fe62-7e8c-92b4-12f817a4f090",
            "Luxembourg": "11e6eef3-fe62-ccad-92b4-12f817a4f090",
            "Macau, China": "11e6eef3-fe63-1ace-92b4-12f817a4f090",
            "Madagascar": "11e6eef3-fe63-9000-92b4-12f817a4f090",
            "Malawi": "11e6eef3-fe64-0531-92b4-12f817a4f090",
            "Malaysia": "11e6eef3-fe3e-c96d-92b4-12f817a4f090",
            "Maldives": "11e6eef3-fe64-2c42-92b4-12f817a4f090",
            "Mali": "11e6eef3-fe64-7a63-92b4-12f817a4f090",
            "Malta": "11e6eef3-fe64-a174-92b4-12f817a4f090",
            "Marshall Islands": "11e6eef3-fe65-3db6-92b4-12f817a4f090",
            "Martinique": "11e6eef3-fe65-64c7-92b4-12f817a4f090",
            "Mauritania": "11e6eef3-fe65-b2e8-92b4-12f817a4f090",
            "Mauritius": "11e6eef3-fe66-0109-92b4-12f817a4f090",
            "Mayotte": "11e6eef3-fe66-281a-92b4-12f817a4f090",
            "Mexico": "11e6eef3-fe3e-f07e-92b4-12f817a4f090",
            "Monaco": "11e6eef3-fe66-eb6d-92b4-12f817a4f090",
            "Mongolia": "11e6eef3-fe67-398e-92b4-12f817a4f090",
            "Montenegro": "11e6eef3-fe7a-24a3-92b4-12f817a4f090",
            "Montserrat": "11e6eef3-fe67-609f-92b4-12f817a4f090",
            "Morocco": "11e6eef3-fe67-aec0-92b4-12f817a4f090",
            "Mozambique": "11e6eef3-fe67-d5d1-92b4-12f817a4f090",
            "Myanmar": "11e6eef3-fe68-23f2-92b4-12f817a4f090",
            "Namibia": "11e6eef3-fe68-7213-92b4-12f817a4f090",
            "Nauru": "11e6eef3-fe68-9924-92b4-12f817a4f090",
            "Nepal": "11e6eef3-fe68-c035-92b4-12f817a4f090",
            "Netherlands": "11e6eef3-fe3f-3e9f-92b4-12f817a4f090",
            "Netherlands Antilles": "11e6eef3-fe69-0e56-92b4-12f817a4f090",
            "New Caledonia": "11e6eef3-fe69-5c77-92b4-12f817a4f090",
            "New Zealand": "11e6eef3-fe3f-65b0-92b4-12f817a4f090",
            "Nicaragua": "11e6eef3-fe69-8388-92b4-12f817a4f090",
            "Niger": "11e6eef3-fe69-d1a9-92b4-12f817a4f090",
            "Nigeria": "11e6eef3-fe69-f8ba-92b4-12f817a4f090",
            "Niue": "11e6eef3-fe6a-1fcb-92b4-12f817a4f090",
            "Norfolk Island": "11e6eef3-fe6a-6dec-92b4-12f817a4f090",
            "North Macedonia": "11e6eef3-fe63-41df-92b4-12f817a4f090",
            "Northern Mariana Islands": "11e6eef3-fe6a-94fd-92b4-12f817a4f090",
            "Norway": "11e6eef3-fe6a-e31e-92b4-12f817a4f090",
            "Oman": "11e6eef3-fe6b-0a2f-92b4-12f817a4f090",
            "Pakistan": "11e6eef3-fe3f-8cc1-92b4-12f817a4f090",
            "Palau": "11e6eef3-fe6b-3040-92b4-12f817a4f090",
            "Palestine": "11e6eef3-fe6b-7e61-92b4-12f817a4f090",
            "Panama": "11e6eef3-fe6b-a572-92b4-12f817a4f090",
            "Papua New Guinea": "11e6eef3-fe6b-f393-92b4-12f817a4f090",
            "Paraguay": "11e6eef3-fe6c-41b4-92b4-12f817a4f090",
            "People's Republic Of China": "11e6eef3-fe3c-cd96-92b4-12f817a4f090",
            "Peru": "11e6eef3-fe6c-68c5-92b4-12f817a4f090",
            "Philippines": "11e6eef3-fe3f-dae2-92b4-12f817a4f090",
            "Pitcairn": "11e6eef3-fe6c-b6e6-92b4-12f817a4f090",
            "Poland": "11e6eef3-fe6c-ddf7-92b4-12f817a4f090",
            "Portugal": "11e6eef3-fe6d-0508-92b4-12f817a4f090",
            "Puerto Rico": "11e6eef3-fe40-01f3-92b4-12f817a4f090",
            "Qatar": "11e6eef3-fe6d-2c19-92b4-12f817a4f090",
            "Republic Of Moldova": "11e6eef3-fe66-c45c-92b4-12f817a4f090",
            "Republic of Korea": "11e6eef3-fe5f-9851-92b4-12f817a4f090",
            "Reunion": "11e6eef3-fe6d-532a-92b4-12f817a4f090",
            "Romania": "11e6eef3-fe6d-7a3b-92b4-12f817a4f090",
            "Russian Federation": "11e6eef3-fe6d-a14c-92b4-12f817a4f090",
            "Rwanda": "11e6eef3-fe6d-ef6d-92b4-12f817a4f090",
            "Saint Barthelemy": "11e6eef3-fe7a-e7f7-92b4-12f817a4f090",
            "Saint Kitts And Nevis": "11e6eef3-fe6e-167e-92b4-12f817a4f090",
            "Saint Martin": "11e6eef3-fe7b-0f08-92b4-12f817a4f090",
            "Samoa": "11e6eef3-fe6e-d9d1-92b4-12f817a4f090",
            "San Marino": "11e6eef3-fe6f-27f2-92b4-12f817a4f090",
            "Santa Lucia": "11e6eef3-fe6e-3d8f-92b4-12f817a4f090",
            "Sao Tome and Principe": "11e6eef3-fe6f-4f03-92b4-12f817a4f090",
            "Saudi Arabia": "11e6eef3-fe6f-9d24-92b4-12f817a4f090",
            "Senegal": "11e6eef3-fe6f-c435-92b4-12f817a4f090",
            "Serbia": "11e6eef3-fe7a-4bb4-92b4-12f817a4f090",
            "Seychelles": "11e6eef3-fe70-1257-92b4-12f817a4f090",
            "Sierra Leone": "11e6eef3-fe70-6078-92b4-12f817a4f090",
            "Singapore": "11e6eef3-fe40-2904-92b4-12f817a4f090",
            "Slovakia": "11e6eef3-fe70-8789-92b4-12f817a4f090",
            "Slovenia": "11e6eef3-fe70-ae9a-92b4-12f817a4f090",
            "Solomon Islands": "11e6eef3-fe70-fcbb-92b4-12f817a4f090",
            "Somalia": "11e6eef3-fe71-23cc-92b4-12f817a4f090",
            "South Africa": "11e6eef3-fe71-71ed-92b4-12f817a4f090",
            "South Georgia and the South Sandwich Islands": "11e6eef3-fe71-c00e-92b4-12f817a4f090",
            "South Sudan": "11e6eef3-fe7b-3619-92b4-12f817a4f090",
            "Spain": "11e6eef3-fe40-7725-92b4-12f817a4f090",
            "Sri Lanka": "11e6eef3-fe72-0e2f-92b4-12f817a4f090",
            "St. Helena": "11e6eef3-fe72-5c50-92b4-12f817a4f090",
            "St. Pierre and Miquelon": "11e6eef3-fe72-aa71-92b4-12f817a4f090",
            "St. Vincent and the Grenadines": "11e6eef3-fe6e-8bb0-92b4-12f817a4f090",
            "Sudan": "11e6eef3-fe72-d182-92b4-12f817a4f090",
            "Suriname": "11e6eef3-fe73-46b3-92b4-12f817a4f090",
            "Svalbard and Jan Mayen Islands": "11e6eef3-fe73-94d4-92b4-12f817a4f090",
            "Sweden": "11e6eef3-fe40-9e36-92b4-12f817a4f090",
            "Switzerland": "11e6eef3-fe40-c547-92b4-12f817a4f090",
            "Syrian Arab Republic": "11e6eef3-fe74-0a06-92b4-12f817a4f090",
            "Tajikistan": "11e6eef3-fe74-7f38-92b4-12f817a4f090",
            "Thailand": "11e6eef3-fe41-1368-92b4-12f817a4f090",
            "Timor-Leste": "11e6eef3-fe4e-3301-92b4-12f817a4f090",
            "Togo": "11e6eef3-fe74-f46a-92b4-12f817a4f090",
            "Tokelau": "11e6eef3-fe75-428b-92b4-12f817a4f090",
            "Tonga": "11e6eef3-fe75-699c-92b4-12f817a4f090",
            "Trinidad and Tobago": "11e6eef3-fe75-90ad-92b4-12f817a4f090",
            "Tunisia": "11e6eef3-fe75-dece-92b4-12f817a4f090",
            "Turkmenistan": "11e6eef3-fe76-5400-92b4-12f817a4f090",
            "Turks and Caicos Islands": "11e6eef3-fe76-a221-92b4-12f817a4f090",
            "Tuvalu": "11e6eef3-fe76-c932-92b4-12f817a4f090",
            "Türkiye": "11e6eef3-fe76-05df-92b4-12f817a4f090",
            "Uganda": "11e6eef3-fe77-1753-92b4-12f817a4f090",
            "Ukraine": "11e6eef3-fe77-3e64-92b4-12f817a4f090",
            "United Arab Emirates": "11e6eef3-fe77-8c85-92b4-12f817a4f090",
            "United Kingdom": "11ea8ef2-64fd-b61d-8533-021fe862c5b8",
            "United Republic Of Tanzania": "11e6eef3-fe74-a649-92b4-12f817a4f090",
            "United States Minor Outlying Islands": "11e6eef3-fe7b-843a-92b4-12f817a4f090",
            "United States of America": "11e6eef3-fe3b-1fe0-92b4-12f817a4f090",
            "Uruguay": "11e6eef3-fe77-b396-92b4-12f817a4f090",
            "Uzbekistan": "11e6eef3-fe78-01b7-92b4-12f817a4f090",
            "Vanuatu": "11e6eef3-fe78-28c8-92b4-12f817a4f090",
            "Vatican City": "11e6eef3-fe78-4fd9-92b4-12f817a4f090",
            "Venezuela": "11e6eef3-fe78-9dfa-92b4-12f817a4f090",
            "Vietnam": "11e6eef3-fe78-c50b-92b4-12f817a4f090",
            "Virgin Islands, British": "11e6eef3-fe79-132d-92b4-12f817a4f090",
            "Virgin Islands, US": "11e6eef3-fe78-ec1c-92b4-12f817a4f090",
            "Wallis and Futuna Islands": "11e6eef3-fe79-3a3e-92b4-12f817a4f090",
            "Western Sahara": "11e6eef3-fe79-614f-92b4-12f817a4f090",
            "Yemen": "11e6eef3-fe79-8860-92b4-12f817a4f090",
            "Zambia": "11e6eef3-fe79-d681-92b4-12f817a4f090",
            "Zimbabwe": "11e6eef3-fe79-fd92-92b4-12f817a4f090"
        }
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        self.last_profile_category_summary: List[Dict[str, Any]] = []
        
        # Competitions endpoint
        self.competitions_url = "https://worldtkd.simplycompete.com/api/competitorRankings"
    
    def configure(self, ranking_category: str, sub_category: str, weight_division: str,
                  athlete_filter: str = None, country_filter: str = None,
                  month: str = None, year: int = None, max_results: int = 100,
                  delay: int = 2):
        """Configure scraper parameters"""
        self.ranking_category = ranking_category
        self.sub_category = sub_category
        self.weight_division = weight_division
        self.athlete_filter = athlete_filter
        self.country_filter = country_filter
        self.month = month
        self.year = year
        self.max_results = max_results
        self.delay = delay
    
    def scrape_data(self, progress_callback: Callable = None) -> List[Dict]:
        """
        Main scraping method that extracts athlete data based on configuration
        """
        try:
            # Check if we need to scrape all weight divisions
            if self.weight_division == "All Weights":
                return self._scrape_all_weight_divisions(progress_callback)
            else:
                return self._scrape_single_weight_division(progress_callback)
                
        except Exception as e:
            self.logger.error(f"Error during scraping: {str(e)}")
            raise
    
    def _scrape_all_weight_divisions(self, progress_callback: Callable = None) -> List[Dict]:
        """Scrape data for all weight divisions"""
        all_athletes = []
        
        # Get weight divisions based on sub-category
        if self.sub_category == "Olympic Senior Division":
            weight_divisions = list(self.olympic_weight_mappings.keys())
        else:  # World Senior Division
            weight_divisions = list(self.world_weight_mappings.keys())
        
        self.logger.info(f"Scraping {len(weight_divisions)} weight divisions: {weight_divisions}")
        
        # Establish session once at the beginning
        if progress_callback:
            progress_callback({'percentage': 10, 'message': '🔒 Establishing secure session...'})
        
        self._establish_session()
        
        # Process each weight division
        for i, weight_division in enumerate(weight_divisions):
            self.logger.info(f"Processing weight division {i+1}/{len(weight_divisions)}: {weight_division}")
            
            # Update progress
            base_progress = 20 + (i * 60 // len(weight_divisions))
            if progress_callback:
                progress_callback({
                    'percentage': base_progress, 
                    'message': f'📊 Scraping {weight_division} ({i+1}/{len(weight_divisions)})...'
                })
            
            # Temporarily set weight division
            original_weight = self.weight_division
            self.weight_division = weight_division
            
            try:
                # Get data for this weight division
                weight_data = self._scrape_single_weight_division_data(
                    lambda progress: progress_callback({
                        'percentage': base_progress + (progress['percentage'] * 60 // len(weight_divisions) // 100),
                        'message': f'{weight_division}: {progress["message"]}'
                    }) if progress_callback else None
                )
                
                all_athletes.extend(weight_data)
                self.logger.info(f"Collected {len(weight_data)} athletes from {weight_division}")
                
            except Exception as e:
                self.logger.warning(f"Error scraping {weight_division}: {str(e)}")
                continue
            finally:
                # Restore original weight division
                self.weight_division = original_weight
        
        # Final processing
        if progress_callback:
            progress_callback({'percentage': 85, 'message': '🧹 Processing combined data...'})
        
        # Apply filters to combined data
        filtered_data = self._apply_filters(all_athletes)
        
        self.logger.info(f"Total athletes from all weight divisions: {len(all_athletes)}")
        self.logger.info(f"Athletes after filtering: {len(filtered_data)}")
        
        # Log weight division breakdown
        weight_breakdown = {}
        for athlete in filtered_data:
            weight = athlete.get('weight_division', 'Unknown')
            weight_breakdown[weight] = weight_breakdown.get(weight, 0) + 1
        self.logger.info(f"Weight division breakdown: {weight_breakdown}")
        
        if progress_callback:
            progress_callback({'percentage': 95, 'message': '📊 Finalizing combined data...'})
        
        # Apply max_results limit at the end if specified
        if self.max_results and len(filtered_data) > self.max_results:
            self.logger.info(f"Applying max_results limit: {self.max_results}")
            return filtered_data[:self.max_results]
        
        return filtered_data
    
    def _scrape_single_weight_division(self, progress_callback: Callable = None) -> List[Dict]:
        """Scrape data for a single weight division"""
        # Update progress
        if progress_callback:
            progress_callback({'percentage': 20, 'message': '🔍 Building API request...'})
        
        # Build API URL with proper parameters
        api_url = self._build_api_url()
        self.logger.info(f"Using API URL: {api_url}")
        self.logger.info(f"Configured weight division: {self.weight_division}")
        
        # Establish session once at the beginning
        if progress_callback:
            progress_callback({'percentage': 25, 'message': '🔒 Establishing secure session...'})
        
        self._establish_session()
        
        # Get data
        all_athletes = self._scrape_single_weight_division_data(progress_callback)
        
        # Apply filters
        if progress_callback:
            progress_callback({'percentage': 80, 'message': '🧹 Filtering and processing data...'})
        
        filtered_data = self._apply_filters(all_athletes)
        
        self.logger.info(f"Total athletes scraped: {len(all_athletes)}")
        self.logger.info(f"Athletes after filtering: {len(filtered_data)}")
        
        # Log duplicate removal
        duplicates_removed = len(all_athletes) - len(filtered_data)
        if duplicates_removed > 0:
            self.logger.info(f"Removed {duplicates_removed} duplicate athlete(s)")
        
        # Log weight division breakdown
        weight_breakdown = {}
        for athlete in filtered_data:
            weight = athlete.get('weight_division', 'Unknown')
            weight_breakdown[weight] = weight_breakdown.get(weight, 0) + 1
        self.logger.info(f"Weight division breakdown: {weight_breakdown}")
        
        # Log some sample data
        if filtered_data:
            self.logger.info(f"Sample athlete data: {filtered_data[0]}")
        
        if progress_callback:
            progress_callback({'percentage': 90, 'message': '📊 Finalizing data extraction...'})
        
        # Apply max_results limit at the end if specified
        if self.max_results and len(filtered_data) > self.max_results:
            self.logger.info(f"Applying max_results limit: {self.max_results}")
            return filtered_data[:self.max_results]
        
        return filtered_data
    
    def _scrape_single_weight_division_data(self, progress_callback: Callable = None) -> List[Dict]:
        """Scrape data for current weight division configuration"""
        # Check if we have multiple countries to process separately
        if self.country_filter and ',' in self.country_filter:
            return self._scrape_multiple_countries(progress_callback)
        
        # Build API URL with proper parameters
        api_url = self._build_api_url()
        
        if progress_callback:
            progress_callback({'percentage': 30, 'message': '📡 Fetching rankings data from API...'})
        
        # Get all pages of data
        all_athletes = []
        page = 1
        max_pages = 10  # Limit to prevent infinite loops
        
        while page <= max_pages:
            current_url = f"{api_url}&pageNo={page}"
            response = self._make_request(current_url)
            
            if not response:
                break
            
            # Parse JSON response
            try:
                json_data = response.json()
                self.logger.info(f"Successfully parsed JSON response from page {page}")
                athletes_data = self._extract_athletes_from_json(json_data)
            except ValueError as e:
                self.logger.warning(f"Failed to parse JSON response: {e}")
                # Fallback to HTML parsing if JSON parsing fails
                soup = BeautifulSoup(response.text, 'html.parser')
                athletes_data = self._extract_athletes_from_html(soup)
            except Exception as e:
                self.logger.warning(f"Error parsing page {page}: {str(e)}")
                break
            
            # Check if we got any data
            if not athletes_data:
                self.logger.info(f"No more athletes found on page {page}, ending pagination")
                break
            
            # Add athletes to our collection
            all_athletes.extend(athletes_data)
            
            # Update progress
            if progress_callback:
                progress_callback({
                    'percentage': min(50 + (page * 10), 70), 
                    'message': f'📊 Fetched page {page} - {len(all_athletes)} athletes found...'
                })
            
            # Increment page counter
            page += 1
            
            # Break if we have enough data or if page returned less than expected
            if len(athletes_data) < 100:  # API returns 100 per page
                self.logger.info(f"Received {len(athletes_data)} athletes (less than 100), likely last page")
                break
        
        return all_athletes
    
    def _scrape_multiple_countries(self, progress_callback: Callable = None) -> List[Dict]:
        """Scrape data for multiple countries separately and combine results"""
        countries = [c.strip() for c in self.country_filter.split(',')]
        all_athletes = []
        
        self.logger.info(f"Processing {len(countries)} countries separately: {countries}")
        
        # Store original country filter
        original_country_filter = self.country_filter
        
        for i, country in enumerate(countries):
            if progress_callback:
                progress_callback({
                    'percentage': int(30 + (i * 40 / len(countries))), 
                    'message': f'🌍 Processing {country} ({i+1}/{len(countries)})...'
                })
            
            # Temporarily set single country filter
            self.country_filter = country
            
            # Scrape data for this country
            try:
                country_athletes = self._scrape_single_country_data()
                all_athletes.extend(country_athletes)
                self.logger.info(f"Found {len(country_athletes)} athletes from {country}")
            except Exception as e:
                self.logger.warning(f"Error scraping data for {country}: {str(e)}")
            
            # Add delay between country requests
            if i < len(countries) - 1:  # Don't delay after the last country
                time.sleep(self.delay)
        
        # Restore original country filter
        self.country_filter = original_country_filter
        
        self.logger.info(f"Total athletes from all countries: {len(all_athletes)}")
        return all_athletes
    
    def _scrape_single_country_data(self) -> List[Dict]:
        """Scrape data for a single country"""
        # Build API URL with proper parameters
        api_url = self._build_api_url()
        
        # Get all pages of data
        all_athletes = []
        page = 1
        max_pages = 10  # Limit to prevent infinite loops
        
        while page <= max_pages:
            current_url = f"{api_url}&pageNo={page}"
            response = self._make_request(current_url)
            
            if not response:
                break
            
            # Parse JSON response
            try:
                json_data = response.json()
                self.logger.info(f"Successfully parsed JSON response from page {page}")
                athletes_data = self._extract_athletes_from_json(json_data)
            except ValueError as e:
                self.logger.warning(f"Failed to parse JSON response: {e}")
                # Fallback to HTML parsing if JSON parsing fails
                soup = BeautifulSoup(response.text, 'html.parser')
                athletes_data = self._extract_athletes_from_html(soup)
            except Exception as e:
                self.logger.warning(f"Error parsing page {page}: {str(e)}")
                break
            
            # Check if we got any data
            if not athletes_data:
                self.logger.info(f"No more athletes found on page {page}, ending pagination")
                break
            
            # Add athletes to our collection
            all_athletes.extend(athletes_data)
            
            # Increment page counter
            page += 1
            
            # Break if we have enough data or if page returned less than expected
            if len(athletes_data) < 100:  # API returns 100 per page
                self.logger.info(f"Received {len(athletes_data)} athletes (less than 100), likely last page")
                break
        
        return all_athletes
    
    def _build_api_url(self) -> str:
        """Build the API URL with proper UUID parameters"""
        params = []
        
        # Add pagination parameters
        params.append("limit=100")
        
        # Add month and year
        if self.month and self.year:
            month_num = self._get_month_number(self.month)
            params.append(f"month={month_num}")
            params.append(f"year={self.year}")
        
        # Add ranking category UUID (using rankingTypeId parameter)
        if self.ranking_category and self.ranking_category in self.ranking_type_mappings:
            category_id = self.ranking_type_mappings[self.ranking_category]
            params.append(f"rankingTypeId={category_id}")
        
        # Add sub category UUID (using subCategory1 parameter)
        if self.sub_category and self.sub_category in self.sub_category_mappings:
            sub_category_id = self.sub_category_mappings[self.sub_category]
            params.append(f"subCategory1={sub_category_id}")
        
        # Add weight division UUID (using rankingCategoryId parameter)
        if self.weight_division and self.weight_division != "All Weights":
            weight_division_id = None
            
            # Choose the correct weight mapping based on sub-category
            if self.sub_category == "Olympic Senior Division":
                weight_division_id = self.olympic_weight_mappings.get(self.weight_division)
            else:  # World Senior Division
                weight_division_id = self.world_weight_mappings.get(self.weight_division)
            
            if weight_division_id:
                params.append(f"rankingCategoryId={weight_division_id}")
        
        # Add country filter UUID - API supports single country per request
        if self.country_filter:
            # Handle single country (for multiple countries, separate requests are made)
            country = self.country_filter.strip()
            if country in self.country_mappings:
                country_id = self.country_mappings[country]
                params.append(f"countryId={country_id}")
        
        return f"{self.api_url}?{'&'.join(params)}"
    
    def _get_month_number(self, month_name: str) -> int:
        """Convert month name to number (0-based: January=0, February=1, etc.)"""
        months = {
            'January': 0, 'February': 1, 'March': 2, 'April': 3,
            'May': 4, 'June': 5, 'July': 6, 'August': 7,
            'September': 8, 'October': 9, 'November': 10, 'December': 11
        }
        return months.get(month_name, 6)  # Default to July (6) instead of 1
    
    def _establish_session(self):
        """Establish session once by visiting the main page"""
        try:
            self.logger.info("Establishing session with main page...")
            self.logger.info("Using cloudscraper to bypass Cloudflare protection...")
            main_response = self.session.get(self.base_url, timeout=30)
            time.sleep(2)  # Wait for session to establish
        except Exception as e:
            self.logger.warning(f"Could not establish session: {str(e)}")
        
        # Update headers for API request
        self.session.headers.update({
            'Referer': self.base_url,
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin'
        })

    def _make_request(self, url: str, retries: int = 3) -> Optional[requests.Response]:
        """Make HTTP request with retry logic and Cloudflare handling"""
        
        for attempt in range(retries):
            try:
                self.logger.info(f"Making request to: {url}")
                
                # Cloudscraper automatically handles Cloudflare challenges
                response = self.session.get(url, timeout=30)
                
                # Check if we still got blocked (shouldn't happen with cloudscraper)
                if response.status_code == 403:
                    self.logger.warning(f"Received 403 status code on attempt {attempt + 1}")
                    if attempt == retries - 1:
                        self.logger.error("Cloudflare protection may have been updated. Consider using alternative bypass methods.")
                        raise Exception("Access blocked despite Cloudflare bypass attempt. Please check CLOUDFLARE_SOLUTION.md for alternative methods.")
                    
                    # Wait longer before retry
                    time.sleep(self.delay * (attempt + 2))
                    continue
                
                response.raise_for_status()
                
                # Log success
                self.logger.info(f"Successfully bypassed Cloudflare protection. Status: {response.status_code}")
                
                # Add delay between requests
                time.sleep(self.delay)
                
                return response
                
            except requests.RequestException as e:
                self.logger.warning(f"Request attempt {attempt + 1} failed: {str(e)}")
                if attempt == retries - 1:
                    self.logger.error(f"All retry attempts failed for URL: {url}")
                    raise Exception(f"Network error: Failed to connect to the API after {retries} attempts. Error: {str(e)}")
                
                time.sleep(self.delay * (attempt + 1))
        
        raise Exception("Failed to make request to the API")

    def _extract_athletes_from_html(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract athlete data from the HTML response"""
        athletes = []
        
        # Look for different possible data structures in the API response
        # Try to find JSON data first (if API returns JSON)
        try:
            # Check if the response contains JSON data
            import json
            json_data = json.loads(soup.get_text())
            if isinstance(json_data, dict) and 'data' in json_data:
                # Process JSON response
                return self._extract_athletes_from_json(json_data)
        except:
            # Not JSON, continue with HTML parsing
            pass
        
        # Look for the table with athlete data
        table = soup.find('table')
        if not table:
            # Try to find other possible data containers
            data_containers = soup.find_all(['div', 'section'], class_=lambda x: x and any(
                keyword in x.lower() for keyword in ['ranking', 'athlete', 'player', 'result']
            ))
            
            if data_containers:
                # Process structured data containers
                for container in data_containers:
                    athlete_data = self._extract_athlete_from_container(container)
                    if athlete_data:
                        athletes.append(athlete_data)
            
            return athletes
        
        # Find all table rows
        rows = table.find_all('tr')
        
        # Skip header row and process athlete rows
        for row in rows[1:]:
            athlete_data = self._extract_athlete_from_table_row(row)
            if athlete_data:
                athletes.append(athlete_data)
        
        return athletes
    
    def _extract_athletes_from_json(self, json_data: Dict) -> List[Dict]:
        """Extract athlete data from JSON response from /rankingsV2 endpoint"""
        athletes = []
        
        # Handle different JSON structures from /rankingsV2
        if isinstance(json_data, list):
            # Direct list of athletes
            for item in json_data:
                athlete = self._extract_athlete_from_json_item(item)
                if athlete:
                    athletes.append(athlete)
        elif isinstance(json_data, dict):
            # Handle nested data structures
            # Check for common JSON response patterns
            data = json_data.get('data', json_data.get('results', json_data.get('rankings', json_data)))
            
            if isinstance(data, list):
                for item in data:
                    athlete = self._extract_athlete_from_json_item(item)
                    if athlete:
                        athletes.append(athlete)
            elif isinstance(data, dict):
                # Handle further nested structures
                for key, value in data.items():
                    if isinstance(value, list):
                        for item in value:
                            athlete = self._extract_athlete_from_json_item(item)
                            if athlete:
                                athletes.append(athlete)
        
        self.logger.info(f"Extracted {len(athletes)} athletes from JSON response")
        return athletes
    
    def _extract_athlete_from_json_item(self, item: Dict) -> Optional[Dict]:
        """Extract athlete data from a single JSON item from /rankingsV2 endpoint"""
        try:
            # Debug: Log the full structure of the first item to understand available fields
            if self.logger.level <= logging.DEBUG:
                self.logger.debug(f"JSON item keys: {list(item.keys())}")
                self.logger.debug(f"JSON item structure: {item}")
            
            # Extract ranking/position
            ranking = item.get('rank', item.get('ranking', item.get('position', 0)))
            
            # Extract name - handle nested structures
            name = item.get('name', item.get('athlete_name', item.get('player_name', '')))
            if isinstance(name, dict):
                name = name.get('full_name', name.get('first_name', '') + ' ' + name.get('last_name', ''))
            
            # Extract country from "nation" field
            country = item.get('nation', item.get('country', item.get('member_nation', '')))
            if isinstance(country, dict):
                country = country.get('name', country.get('code', ''))
            
            # Extract points/score
            points = item.get('points', item.get('score', item.get('rating', 0)))
            try:
                points = float(points) if points else 0
            except (ValueError, TypeError):
                points = 0
            
            # Calculate change from previousRank and rank
            current_rank = int(ranking) if ranking else 0
            previous_rank = item.get('previousRank', 0)
            change = ""
            if previous_rank and current_rank:
                try:
                    prev_rank = int(previous_rank)
                    if prev_rank > current_rank:
                        change = f"+{prev_rank - current_rank}"
                    elif prev_rank < current_rank:
                        change = f"-{current_rank - prev_rank}"
                    else:
                        change = "0"
                except (ValueError, TypeError):
                    change = ""
            
            # Determine gender from gender UUID
            gender_id = item.get('gender', item.get('genderId', ''))
            gender = ""
            if gender_id == "11e6eef3-fd24-a707-92b4-12f817a4f090":
                gender = "Male"
            elif gender_id == "11e6eef3-fd24-ce18-92b4-12f817a4f090":
                gender = "Female"
            
            # Extract profile picture URL from profilePicId if available
            profile_pic_id = item.get('profilePicId', '')
            profile_pic = ''
            if profile_pic_id:
                # Use profilePicId as-is since it's already a full URL
                profile_pic = profile_pic_id
            
            # Extract userid from the API response - try multiple possible field names
            user_id = item.get('userId', item.get('id', item.get('athlete_id', 
                      item.get('user_id', item.get('playerId', item.get('player_id', 
                      item.get('memberID', item.get('member_id', item.get('athleteId', '')))))))))
            
            # If no userid found, log available keys for debugging
            if not user_id:
                self.logger.info(f"No userid found. Available keys: {list(item.keys())}")
            
            # Build athlete data structure
            athlete_data = {
                'ranking': str(ranking),
                'name': str(name).strip(),
                'country': str(country).strip(),
                'gender': gender,
                'weight_division': self.weight_division if self.weight_division != "All Weights" else "N/A",
                'points': str(points),
                'change': change,
                'profilePic': profile_pic,
                'userid': str(user_id) if user_id else '',
                'category': self.ranking_category,
                'sub_category': self.sub_category,
                'month': self.month,
                'year': self.year
            }
            
            return athlete_data
            
        except Exception as e:
            self.logger.warning(f"Error processing JSON item: {e}")
            self.logger.debug(f"JSON item structure: {item}")
            return None
    
    def _extract_athlete_from_container(self, container) -> Optional[Dict]:
        """Extract athlete data from a structured container"""
        try:
            # Look for common patterns in athlete data containers
            name_elem = container.find(text=lambda text: text and any(
                keyword in text.lower() for keyword in ['name', 'athlete', 'player']
            ))
            country_elem = container.find(text=lambda text: text and any(
                keyword in text.lower() for keyword in ['country', 'nation', 'flag']
            ))
            points_elem = container.find(text=lambda text: text and any(
                char.isdigit() or char == '.' for char in text
            ))
            
            if name_elem and country_elem and points_elem:
                return {
                    'ranking': 0,  # Will be assigned later
                    'name': str(name_elem).strip(),
                    'country': str(country_elem).strip(),
                    'points': float(''.join(c for c in str(points_elem) if c.isdigit() or c == '.')),
                    'change': '',
                    'id': ''
                }
        except Exception as e:
            self.logger.warning(f"Error processing container: {e}")
        
        return None
    
    def _extract_athlete_from_table_row(self, row) -> Optional[Dict]:
        """Extract athlete data from a table row"""
        try:
            cells = row.find_all('td')
            if len(cells) < 5:  # Should have at least 5 columns: rank, change, name, country, points
                return None
            
            # Extract ranking (first column)
            rank_cell = cells[0]
            ranking = rank_cell.get_text(strip=True)
            
            # Extract name (third column, contains athlete name and ID)
            name_cell = cells[2]
            name_text = name_cell.get_text(strip=True)
            # Extract name before the parentheses (athlete ID)
            name_parts = name_text.split('(')
            athlete_name = name_parts[0].strip() if name_parts else name_text
            
            # Extract country (fourth column)
            country_cell = cells[3]
            country_text = country_cell.get_text(strip=True)
            
            # Extract points (fifth column)
            points_cell = cells[4]
            points = points_cell.get_text(strip=True)
            
            athlete_data = {
                'ranking': self._clean_ranking_text(ranking),
                'name': athlete_name,
                'country': country_text,
                'weight_division': self.weight_division if self.weight_division != "All Weights" else "N/A",
                'points': points,
                'category': self.ranking_category,
                'sub_category': self.sub_category,
                'month': self.month,
                'year': self.year
            }
            
            return athlete_data
            
        except Exception as e:
            self.logger.warning(f"Error extracting athlete data from row: {str(e)}")
            return None
    
    def _clean_ranking_text(self, ranking_text: str) -> str:
        """Clean ranking text to extract just the number"""
        # Remove any non-digit characters and get just the number
        import re
        match = re.search(r'\d+', ranking_text)
        return match.group() if match else "999"
    

    
    def _apply_filters(self, athletes_data: List[Dict]) -> List[Dict]:
        """Apply configured filters to the scraped data"""
        filtered_data = athletes_data
        
        # Apply athlete name filter
        if self.athlete_filter:
            filtered_data = [
                athlete for athlete in filtered_data
                if self.athlete_filter.lower() in athlete.get('name', '').lower()
            ]
        
        # Note: Country filtering is now handled at the API level via countryId parameter
        # No need for additional post-processing filtering
        
        # Remove duplicates based on athlete name and ranking
        seen = set()
        unique_data = []
        duplicates_found = []
        
        for athlete in filtered_data:
            key = (athlete.get('name'), athlete.get('ranking'))
            if key not in seen:
                seen.add(key)
                unique_data.append(athlete)
            else:
                # Log duplicate athlete
                duplicates_found.append({
                    'name': athlete.get('name'),
                    'ranking': athlete.get('ranking'),
                    'country': athlete.get('country'),
                    'points': athlete.get('points')
                })
        
        # Log duplicate athletes if any found
        if duplicates_found:
            self.logger.info(f"Duplicate athletes found and removed: {duplicates_found}")
        
        return unique_data
    
    def _set_profile_category_summary(self, summary: List[Dict[str, Any]]):
        """Store the latest category summary derived from player profile data."""
        self.last_profile_category_summary = summary
    
    def get_athlete_competitions(self, user_id: str) -> List[Dict]:
        """
        Fetch competition history for a specific athlete using their userId
        """
        try:
            # First attempt to get real competition data through available API endpoints
            self.logger.info(f"Attempting to fetch real competition data for athlete {user_id}")
            self._set_profile_category_summary([])
            
            # Try various API approaches that might not be protected
            real_competitions = self._get_real_competition_data(user_id)
            if real_competitions:
                self.logger.info(f"Successfully retrieved {len(real_competitions)} real competitions for athlete {user_id}")
                return real_competitions
            
            # If no real data available, return empty list with clear error
            self.logger.warning(f"No competition data accessible for athlete {user_id} - all endpoints protected")
            return []
            
            # Build the URL for athlete competitions
            # Try different possible URL patterns for athlete profile pages
            possible_urls = [
                f"{self.base_url}/player/{user_id}",
                f"{self.base_url}/athletes/{user_id}",
                f"{self.base_url}/profile/{user_id}",
                f"{self.base_url}/playerProfile/{user_id}",
                f"{self.base_url}/competitorProfile/{user_id}",
                f"{self.base_url}/playerRankings/{user_id}"
            ]
            
            athlete_url = None
            # Try each URL pattern until we find one that works
            for url in possible_urls:
                self.logger.info(f"Trying URL pattern: {url}")
                try:
                    test_response = self.session.get(url, timeout=10)
                except Exception as e:
                    self.logger.debug(f"URL {url} failed: {str(e)}")
                    continue

                if test_response and test_response.status_code == 200:
                    # Check if the response contains competition data
                    if 'table' in test_response.text.lower() or 'competition' in test_response.text.lower():
                        athlete_url = url
                        self.logger.info(f"Found working URL: {athlete_url}")
                        break
            
            if not athlete_url:
                self.logger.warning("Could not find a working URL pattern for athlete profile, trying API approach")
                # Try API endpoints for competition data
                return self._get_competitions_via_api(user_id)
            
            # Establish session if not already done
            self._establish_session()
            
            # Make request to athlete profile page
            response = self._make_request(athlete_url)
            if not response:
                self.logger.error(f"Failed to fetch athlete profile page")
                return []
            
            # Parse HTML response
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find the competitions table
            competitions = []
            
            # Look for the table with competition data (similar to the HTML structure provided)
            tables = soup.find_all('table', class_=['table', 'dataTable'])
            
            for table in tables:
                # Check if this is the competitions table by looking for specific headers
                header_row = table.find('thead')
                if header_row:
                    headers = [th.get_text().strip() for th in header_row.find_all('th')]
                    
                    # Check if this table contains competition data
                    if any(header in ['Event', 'Event Date', 'Location', 'Place', 'Ranking Points'] for header in headers):
                        # This is the competitions table
                        tbody = table.find('tbody')
                        if tbody:
                            rows = tbody.find_all('tr')
                            
                            for row in rows:
                                competition = self._extract_competition_from_row(row)
                                if competition:
                                    competitions.append(competition)
            
            self.logger.info(f"Found {len(competitions)} competitions for athlete")
            return competitions
            
        except Exception as e:
            self.logger.error(f"Error fetching athlete competitions: {str(e)}")
            return []
    
    def _get_sample_competition_data(self) -> List[Dict]:
        """Return sample competition data for demonstration"""
        self.logger.info("Returning sample competition data from known athlete profile")
        
        return [
            {
                "event_name": "Rhine-Ruhr 2025 FISU World University Games",
                "g_rank": "G-4",
                "event_date": "2025-07-17",
                "location": "Rhine-Ruhr, Germany",
                "place": "5",
                "ranking_points": "8.64",
                "event_url": "/playerMatchResult/11e90126-4e0c-13f5-9a7c-0a8d8ddc92c4/11f06e13-1e2a-06fd-9d0d-027168847c43"
            },
            {
                "event_name": "Charlotte 2025 World Taekwondo Grand Prix Challenge",
                "g_rank": "G-2",
                "event_date": "2025-06-13",
                "location": "Charlotte, United States",
                "place": "5",
                "ranking_points": "3.02",
                "event_url": "/playerMatchResult/11e90126-4e0c-13f5-9a7c-0a8d8ddc92c4/11effffa-42d0-2a88-a95e-06cafb866567"
            },
            {
                "event_name": "2025 WT President's Cup - Africa",
                "g_rank": "G-3",
                "event_date": "2025-04-25",
                "location": "Addis Ababa, Ethiopia",
                "place": "1",
                "ranking_points": "30.00",
                "event_url": "/playerMatchResult/11e90126-4e0c-13f5-9a7c-0a8d8ddc92c4/11efdfd7-835b-5c11-af3d-06d0d42b42ed"
            },
            {
                "event_name": "12th Fujairah Open 2025",
                "g_rank": "G-2",
                "event_date": "2025-02-09",
                "location": "Fujairah, UAE",
                "place": "5",
                "ranking_points": "4.32",
                "event_url": "/playerMatchResult/11e90126-4e0c-13f5-9a7c-0a8d8ddc92c4/11ef9500-dd96-2d3d-8252-06b65c80c36d"
            },
            {
                "event_name": "Fujairah 5th Arab Cup 2025 (For Arab Countries ONLY)",
                "g_rank": "G-1",
                "event_date": "2025-02-05",
                "location": "Fujairah, UAE",
                "place": "3",
                "ranking_points": "3.60",
                "event_url": "/playerMatchResult/11e90126-4e0c-13f5-9a7c-0a8d8ddc92c4/11ef99f9-37f2-a58f-b464-02104627b047"
            },
            {
                "event_name": "2024 Malabo Open",
                "g_rank": "G-2",
                "event_date": "2024-10-15",
                "location": "Malabo, Equatorial Guinea",
                "place": "1",
                "ranking_points": "12.00",
                "event_url": "/playerMatchResult/11e90126-4e0c-13f5-9a7c-0a8d8ddc92c4/11ef1b58-1b7f-1548-93bc-02d71fd5e8a1"
            },
            {
                "event_name": "2024 WT President's Cup - Africa",
                "g_rank": "G-2",
                "event_date": "2024-10-12",
                "location": "Malabo, Equatorial Guinea",
                "place": "1",
                "ranking_points": "8.00",
                "event_url": "/playerMatchResult/11e90126-4e0c-13f5-9a7c-0a8d8ddc92c4/11ef1b58-0105-e420-93bc-02d71fd5e8a1"
            }
        ]
    
    def _get_sample_competition_data_for_athlete(self, user_id: str) -> List[Dict]:
        """
        Generate sample competition data for any athlete to demonstrate functionality.
        Uses realistic competition data while website access is limited.
        """
        import random
        
        # Competition templates with realistic events
        competition_templates = [
            {
                'event_name': '2025 World Taekwondo Championships',
                'g_rank': 'G-4',
                'location': 'Seoul, South Korea',
                'place_options': ['1', '2', '3', '5', '7'],
                'points_range': (15.0, 50.0),
                'dates': ['2025-05-15', '2025-05-18', '2025-05-22']
            },
            {
                'event_name': '2025 European Open Championships',
                'g_rank': 'G-3',
                'location': 'Paris, France',
                'place_options': ['1', '3', '5', '7', '9'],
                'points_range': (8.0, 25.0),
                'dates': ['2025-04-12', '2025-04-15', '2025-04-18']
            },
            {
                'event_name': '2024 Grand Prix Final',
                'g_rank': 'G-4',
                'location': 'Manchester, United Kingdom',
                'place_options': ['2', '3', '5', '9'],
                'points_range': (12.0, 35.0),
                'dates': ['2024-12-08', '2024-12-11', '2024-12-14']
            },
            {
                'event_name': '2024 Asian Championships',
                'g_rank': 'G-3',
                'location': 'Tokyo, Japan',
                'place_options': ['1', '2', '5', '7'],
                'points_range': (10.0, 28.0),
                'dates': ['2024-11-20', '2024-11-23', '2024-11-26']
            },
            {
                'event_name': '2024 Pan American Open',
                'g_rank': 'G-2',
                'location': 'Mexico City, Mexico',
                'place_options': ['1', '3', '5', '9'],
                'points_range': (5.0, 18.0),
                'dates': ['2024-09-15', '2024-09-18', '2024-09-21']
            },
            {
                'event_name': '2024 African Championships',
                'g_rank': 'G-2',
                'location': 'Cairo, Egypt',
                'place_options': ['1', '2', '3', '7'],
                'points_range': (6.0, 20.0),
                'dates': ['2024-08-10', '2024-08-13', '2024-08-16']
            }
        ]
        
        # Use user_id as seed for consistent results for the same athlete
        random.seed(hash(user_id) % (2**32))
        
        # Generate 3-6 competitions for demonstration
        num_competitions = random.randint(3, 6)
        competitions = []
        
        selected_templates = random.sample(competition_templates, min(num_competitions, len(competition_templates)))
        
        for template in selected_templates:
            place = random.choice(template['place_options'])
            points = round(random.uniform(*template['points_range']), 2)
            date = random.choice(template['dates'])
            
            competition = {
                'event_name': template['event_name'],
                'g_rank': template['g_rank'],
                'event_date': date,
                'location': template['location'],
                'place': place,
                'ranking_points': str(points),
                'event_url': f'/playerMatchResult/{user_id}/{self._generate_event_id()}'
            }
            competitions.append(competition)
        
        # Sort by date (most recent first)
        competitions.sort(key=lambda x: x['event_date'], reverse=True)
        
        return competitions
    
    def _generate_event_id(self) -> str:
        """Generate a realistic-looking event ID"""
        import random
        hex_chars = '0123456789abcdef'
        return ''.join(random.choices(hex_chars, k=32))
    
    def _get_real_competition_data(self, user_id: str) -> List[Dict]:
        """
        Attempt to get real competition data using the same cloudscraper approach that works for rankings.
        """
        self.logger.info(f"Attempting to access real competition data for user_id: {user_id}")
        
        # Strategy 1: Try variations of the working rankingsV2 endpoint with competition-specific parameters
        rankings_api_variations = [
            f"{self.base_url}/rankingsV2?userId={user_id}&includeCompetitions=true&limit=100",
            f"{self.base_url}/rankingsV2?userId={user_id}&showHistory=true&limit=100",
            f"{self.base_url}/rankingsV2?userId={user_id}&details=true&limit=100",
            f"{self.base_url}/rankingsV2?userId={user_id}&competitions=true&limit=100",
            f"{self.base_url}/rankingsV2?playerId={user_id}&limit=100",
            f"{self.base_url}/rankingsV2?competitorId={user_id}&limit=100"
        ]
        
        for api_url in rankings_api_variations:
            try:
                self.logger.info(f"Trying rankings API variation: {api_url}")
                response = self.session.get(api_url, timeout=15)
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        # Check if we got competition data in the response
                        if self._extract_competitions_from_rankings_response(data, user_id):
                            competitions = self._extract_competitions_from_rankings_response(data, user_id)
                            self.logger.info(f"Found real competition data via rankings API: {api_url}")
                            return competitions
                    except Exception as e:
                        self.logger.debug(f"Failed to parse rankings API response: {str(e)}")
                        
            except Exception as e:
                self.logger.debug(f"Rankings API variation {api_url} failed: {str(e)}")
                continue
        
        # Strategy 2: Use getPlayerProfileV2 with the current scraper configuration
        try:
            profile_api_url = f"{self.base_url}/getPlayerProfileV2"

            ranking_type_id = self.ranking_type_mappings.get(self.ranking_category)
            if not ranking_type_id and self.ranking_type_mappings:
                ranking_type_id = next(iter(self.ranking_type_mappings.values()))

            if self.month:
                month_num = self._get_month_number(self.month)
            else:
                month_num = max(datetime.now().month - 1, 0)

            year = self.year or datetime.now().year

            params = {
                "userId": user_id,
                "countryId": "null",
                "month": month_num,
                "year": year,
                "rankingTypeId": ranking_type_id,
            }

            if self.sub_category and self.sub_category in self.sub_category_mappings:
                params["subCategory1"] = self.sub_category_mappings[self.sub_category]

            weight_mapping = None
            if self.sub_category == "Olympic Senior Division":
                weight_mapping = self.olympic_weight_mappings
            elif self.sub_category == "World Senior Division":
                weight_mapping = self.world_weight_mappings

            if weight_mapping and self.weight_division in weight_mapping:
                params["rankingCategoryId"] = weight_mapping[self.weight_division]

            self.logger.info(
                "🎯 Trying getPlayerProfileV2 with parameters: %s", params
            )
            response = self.session.get(profile_api_url, params=params, timeout=15)

            if response.status_code == 200:
                try:
                    data = response.json()
                    profile_data = (
                        data.get("data", {}).get("data")
                        if isinstance(data, dict)
                        else None
                    )
                    if isinstance(profile_data, dict):
                        ranking_categories = profile_data.get("rankingCategory", [])
                        if isinstance(ranking_categories, list) and ranking_categories:
                            self.logger.info(
                                "✅ SUCCESS: Found REAL competition data via getPlayerProfileV2!"
                            )
                            competitions = self._process_player_profile_competition_data(
                                ranking_categories
                            )
                            if competitions:
                                return competitions
                except Exception as e:
                    self.logger.debug(
                        f"Error parsing getPlayerProfileV2 response: {str(e)}"
                    )
        except Exception as e:
            self.logger.debug(f"getPlayerProfileV2 request failed: {str(e)}")
        
        # Fallback: Try other competition endpoints if getPlayerProfileV2 fails
        competition_api_patterns = [
            f"{self.base_url}/competitionsV2?userId={user_id}&limit=100",
            f"{self.base_url}/eventsV2?userId={user_id}&limit=100", 
            f"{self.base_url}/resultsV2?userId={user_id}&limit=100"
        ]
        
        for api_url in competition_api_patterns:
            try:
                self.logger.info(f"Trying competition API: {api_url}")
                response = self.session.get(api_url, timeout=10)
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        # Check if we got the getPlayerProfileV2 response structure
                        if isinstance(data, dict) and 'data' in data and 'data' in data['data']:
                            profile_data = data['data']['data']
                            if 'rankingCategory' in profile_data and isinstance(profile_data['rankingCategory'], list):
                                self.logger.info(f"✅ SUCCESS: Found REAL competition data via getPlayerProfileV2: {api_url}")
                                return self._process_player_profile_competition_data(profile_data['rankingCategory'])
                        
                        # Fallback to check other data structures
                        elif isinstance(data, dict):
                            if 'competitions' in data and isinstance(data['competitions'], list) and len(data['competitions']) > 0:
                                self.logger.info(f"Found real competition data via API: {api_url}")
                                return self._process_api_competition_data(data['competitions'])
                            elif 'data' in data and isinstance(data['data'], list) and len(data['data']) > 0:
                                self.logger.info(f"Found real competition data via API: {api_url}")
                                return self._process_api_competition_data(data['data'])
                        elif isinstance(data, list) and len(data) > 0:
                            self.logger.info(f"Found real competition data via API: {api_url}")
                            return self._process_api_competition_data(data)
                    except Exception as e:
                        # Not JSON, might be HTML - check if it contains competition table
                        if 'competition' in response.text.lower() and 'table' in response.text.lower():
                            return self._extract_competitions_from_html(response.text, user_id)
                        self.logger.debug(f"Error parsing JSON response: {str(e)}")
                        
            except Exception as e:
                self.logger.debug(f"API endpoint {api_url} failed: {str(e)}")
                continue
        
        # Strategy 2: Try to access competition data through search/query endpoints
        search_patterns = [
            f"{self.base_url}/search/athlete/{user_id}/competitions",
            f"{self.base_url}/query/competitions?athlete={user_id}",
            f"{self.base_url}/rankings/details/{user_id}"
        ]
        
        for search_url in search_patterns:
            try:
                self.logger.info(f"Trying search endpoint: {search_url}")
                response = self.session.get(search_url, timeout=10)
                if response.status_code == 200:
                    try:
                        data = response.json()
                        if data and 'competitions' in data:
                            self.logger.info(f"Found competition data via search: {search_url}")
                            return self._process_api_competition_data(data['competitions'])
                    except json.JSONDecodeError:
                        pass
            except Exception as e:
                self.logger.debug(f"Search endpoint {search_url} failed: {str(e)}")
                continue
        
        # Strategy 3: Check if we can access athlete-specific ranking events that might contain competition info
        try:
            self.logger.info("Attempting to derive competition data from ranking events")
            competition_data = self._derive_competitions_from_rankings(user_id)
            if competition_data:
                self.logger.info("Successfully derived competition data from ranking information")
                return competition_data
        except Exception as e:
            self.logger.debug(f"Failed to derive competitions from rankings: {str(e)}")
        
        # If all strategies fail, return empty list
        self.logger.warning(f"Unable to access real competition data for user_id {user_id} - all endpoints protected or unavailable")
        return []
    
    def _process_api_competition_data(self, raw_data: List[Dict]) -> List[Dict]:
        """Process raw competition data from API into standard format"""
        competitions = []
        
        for item in raw_data:
            # Standardize the competition data format
            competition = {
                'event_name': item.get('eventName', item.get('event_name', item.get('tournament', 'Unknown Event'))),
                'g_rank': item.get('gRank', item.get('g_rank', item.get('rank', 'N/A'))),
                'event_date': item.get('eventDate', item.get('event_date', item.get('date', 'Unknown Date'))),
                'location': item.get('location', item.get('venue', item.get('city', 'Unknown Location'))),
                'place': str(item.get('place', item.get('position', item.get('finish', 'N/A')))),
                'ranking_points': str(item.get('rankingPoints', item.get('points', item.get('score', '0')))),
                'event_url': item.get('eventUrl', item.get('url', f'/competition/{item.get("id", "unknown")}'))
            }
            competitions.append(competition)
        
        return competitions
    
    def _extract_competitions_from_html(self, html_content: str, user_id: str) -> List[Dict]:
        """Extract competition data from HTML content"""
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Look for competition tables
            competitions = []
            tables = soup.find_all('table')
            
            for table in tables:
                # Check if this looks like a competition table
                headers = [th.get_text().strip().lower() for th in table.find_all('th')]
                if any(keyword in ' '.join(headers) for keyword in ['event', 'competition', 'tournament', 'date', 'place', 'points']):
                    # Extract data from this table
                    rows = table.find_all('tr')[1:]  # Skip header row
                    for row in rows:
                        cells = [td.get_text().strip() for td in row.find_all('td')]
                        if len(cells) >= 4:  # Minimum expected columns
                            competition = {
                                'event_name': cells[0] if cells[0] else 'Unknown Event',
                                'g_rank': cells[1] if len(cells) > 1 and cells[1] else 'N/A',
                                'event_date': cells[2] if len(cells) > 2 and cells[2] else 'Unknown Date',
                                'location': cells[3] if len(cells) > 3 and cells[3] else 'Unknown Location',
                                'place': cells[4] if len(cells) > 4 and cells[4] else 'N/A',
                                'ranking_points': cells[5] if len(cells) > 5 and cells[5] else '0',
                                'event_url': f'/playerMatchResult/{user_id}/unknown'
                            }
                            competitions.append(competition)
            
            return competitions
            
        except Exception as e:
            self.logger.error(f"Error extracting competitions from HTML: {str(e)}")
            return []
    
    def _derive_competitions_from_rankings(self, user_id: str) -> List[Dict]:
        """
        Attempt to derive competition information from rankings data or other accessible endpoints.
        This is a last resort when direct competition APIs are not accessible.
        """
        try:
            # This would require access to historical ranking data or event databases
            # Since all individual athlete APIs are blocked, this will also likely fail
            # But we try a few alternative approaches
            
            historical_endpoints = [
                f"{self.base_url}/rankingsHistory?userId={user_id}",
                f"{self.base_url}/api/rankings/history/{user_id}",
                f"{self.base_url}/events/participant/{user_id}"
            ]
            
            for endpoint in historical_endpoints:
                try:
                    response = self.session.get(endpoint, timeout=10)
                    if response.status_code == 200:
                        data = response.json()
                        # Process historical data if available
                        if data and ('events' in data or 'history' in data):
                            return self._convert_historical_to_competitions(data, user_id)
                except:
                    continue
            
            return []
            
        except Exception as e:
            self.logger.debug(f"Could not derive competitions from rankings: {str(e)}")
            return []
    
    def _convert_historical_to_competitions(self, historical_data: Dict, user_id: str) -> List[Dict]:
        """Convert historical ranking data to competition format"""
        competitions = []
        
        # This would process historical data if it was accessible
        # Implementation would depend on the actual structure of historical data
        
        return competitions
    
    def _extract_competitions_from_rankings_response(self, data: Dict, user_id: str) -> Optional[List[Dict]]:
        """Extract competition data from rankings API response if available"""
        try:
            # Check if the response contains competition/event data
            if isinstance(data, dict):
                # Look for competition-related fields in the response
                for key in ['competitions', 'events', 'matches', 'results', 'history', 'performance']:
                    if key in data and isinstance(data[key], list) and len(data[key]) > 0:
                        self.logger.info(f"Found competition data in field: {key}")
                        return self._process_api_competition_data(data[key])
                
                # Check if athlete data includes embedded competition info
                if 'data' in data and isinstance(data['data'], list) and len(data['data']) > 0:
                    for athlete in data['data']:
                        if isinstance(athlete, dict):
                            # Look for embedded competition data
                            for comp_key in ['competitions', 'events', 'matches', 'tournamentHistory']:
                                if comp_key in athlete and isinstance(athlete[comp_key], list) and len(athlete[comp_key]) > 0:
                                    self.logger.info(f"Found embedded competition data in athlete.{comp_key}")
                                    return self._process_api_competition_data(athlete[comp_key])
            
            return None
            
        except Exception as e:
            self.logger.debug(f"Error extracting competitions from rankings response: {str(e)}")
            return None
    
    def _process_player_profile_competition_data(self, ranking_categories: List[Dict]) -> List[Dict]:
        """Process competition data from getPlayerProfileV2 response structure"""
        competitions = []
        category_summaries: List[Dict[str, Any]] = []
        
        try:
            for category in ranking_categories:
                if 'eventResults' in category and isinstance(category['eventResults'], list):
                    category_name = category.get('rankingCategoryName', 'Unknown Category')
                    total_points = category.get('totalPoints', '0')
                    rank_value = (
                        category.get('rank')
                        or category.get('currentRank')
                        or category.get('ranking')
                        or category.get('position')
                    )
                    ranking_type = category.get('rankingTypeName') or category.get('rankingType')
                    division_name = category.get('divisionName') or category.get('division')
                    weight_division = category.get('weightDivisionName') or category.get('weightDivision')
                    history_entries = category.get('rankingHistory') or category.get('history') or []
                    simplified_history: List[Dict[str, Any]] = []
                    if isinstance(history_entries, list):
                        for entry in history_entries:
                            if isinstance(entry, dict):
                                simplified_history.append({
                                    'year': entry.get('year'),
                                    'month': entry.get('month'),
                                    'month_label': entry.get('monthLabel') or entry.get('label'),
                                    'rank': entry.get('rank') or entry.get('currentRank') or entry.get('position'),
                                    'points': entry.get('points') or entry.get('totalPoints'),
                                })
                    
                    category_summaries.append({
                        'category_name': category_name,
                        'rank': rank_value,
                        'total_points': total_points,
                        'ranking_type': ranking_type,
                        'division': division_name,
                        'weight_division': weight_division,
                        'history': simplified_history,
                    })
                    
                    for event in category['eventResults']:
                        # DEBUG: Log first event to identify placement field
                        if len(competitions) == 0:
                            import json
                            self.logger.info(f"🔍 DEBUG: Sample event object keys: {list(event.keys())}")
                            self.logger.info(f"🔍 DEBUG: Sample event object: {json.dumps(event, ensure_ascii=False, indent=2)}")
                        
                        # FIXED: eventResult contains the actual placement (1, 2, 3, etc.)
                        # The 'place' field is unreliable and often defaults to 1
                        place = (
                            event.get('eventResult') or  # PRIMARY SOURCE - actual placement
                            event.get('place') or 
                            event.get('placing') or 
                            event.get('rank') or 
                            event.get('position') or 
                            event.get('finalRank') or 
                            event.get('finalPosition') or
                            'Unknown Place'
                        )
                        
                        competition = {
                            'event_name': event.get('eventName', 'Unknown Event'),
                            'event_date': event.get('endDate', 'Unknown Date'),
                            'location': event.get('location', 'Unknown Location'),
                            'place': place,
                            'ranking_points': event.get('rankingPoints', '0'),
                            'g_rank': event.get('gRank', 'Unknown'),
                            'event_result': event.get('eventResult', 'Unknown'),
                            'event_id': event.get('eventId', ''),
                            'start_date': event.get('startDate', ''),
                            'generated_end_date': event.get('generatedEndDate', ''),
                            'category': category_name,
                            'category_total_points': total_points
                        }
                        
                        # DEBUG: Log mapped place value
                        if len(competitions) == 0:
                            self.logger.info(f"🔍 DEBUG: Mapped place value: {place}")
                        
                        competitions.append(competition)
                        
            self.logger.info(f"Successfully processed {len(competitions)} competitions from getPlayerProfileV2")
            self._set_profile_category_summary(category_summaries)
            return competitions
            
        except Exception as e:
            self.logger.error(f"Error processing getPlayerProfileV2 competition data: {str(e)}")
            self._set_profile_category_summary(category_summaries)
            return []
    
    def _extract_competition_from_row(self, row) -> Optional[Dict]:
        """Extract competition data from a table row"""
        try:
            cells = row.find_all(['td', 'th'])
            if len(cells) < 4:  # Need at least event, date, location, place
                return None
            
            # Extract event name and eventId from the link
            event_link = cells[0].find('a')
            event_name = ""
            event_id = ""
            
            if event_link:
                event_name = event_link.get_text().strip()
                href = event_link.get('href', '')
                
                # Extract eventId from href like "/playerMatchResult/userId/eventId?embedded=false"
                import re
                event_match = re.search(r'/playerMatchResult/[^/]+/([^/?]+)', href)
                if event_match:
                    event_id = event_match.group(1)
            else:
                event_name = cells[0].get_text().strip()
            
            # Extract other data
            g_rank = cells[1].get_text().strip() if len(cells) > 1 else ""
            event_date = cells[2].get_text().strip() if len(cells) > 2 else ""
            location = cells[3].get_text().strip() if len(cells) > 3 else ""
            place = cells[4].get_text().strip() if len(cells) > 4 else ""
            ranking_points = cells[5].get_text().strip() if len(cells) > 5 else ""
            
            # Convert ranking points to float
            try:
                ranking_points_num = float(ranking_points) if ranking_points else 0.0
            except ValueError:
                ranking_points_num = 0.0
            
            return {
                'event_name': event_name,
                'event_id': event_id,
                'g_rank': g_rank,
                'event_date': event_date,
                'location': location,
                'place': place,
                'ranking_points': ranking_points,
                'ranking_points_num': ranking_points_num
            }
            
        except Exception as e:
            self.logger.warning(f"Error extracting competition data from row: {str(e)}")
            return None
    
    def _get_competitions_via_api(self, user_id: str) -> List[Dict]:
        """Try to get competition data via API endpoints"""
        try:
            # Possible API endpoints for competition data
            api_endpoints = [
                f"{self.base_url}/api/competitorRankings/{user_id}",
                f"{self.base_url}/api/playerCompetitions/{user_id}",
                f"{self.base_url}/api/athlete/{user_id}/competitions",
                f"{self.base_url}/competitorRankingsV2?playerId={user_id}",
                f"{self.base_url}/playerCompetitionsV2?userId={user_id}"
            ]
            
            for endpoint in api_endpoints:
                self.logger.info(f"Trying API endpoint: {endpoint}")
                try:
                    response = self.session.get(endpoint, timeout=10)
                    if response.status_code == 200:
                        # Try to parse JSON response
                        try:
                            data = response.json()
                            competitions = self._extract_competitions_from_api_response(data)
                            if competitions:
                                self.logger.info(f"Successfully got {len(competitions)} competitions from API")
                                return competitions
                        except:
                            # If not JSON, try HTML parsing
                            soup = BeautifulSoup(response.text, 'html.parser')
                            competitions = self._extract_competitions_from_html(soup)
                            if competitions:
                                self.logger.info(f"Successfully got {len(competitions)} competitions from HTML API response")
                                return competitions
                            
                except Exception as e:
                    self.logger.debug(f"API endpoint {endpoint} failed: {str(e)}")
                    continue
            
            self.logger.warning("No working API endpoints found for competition data")
            return []
            
        except Exception as e:
            self.logger.error(f"Error in API approach: {str(e)}")
            return []
    
    def _extract_competitions_from_api_response(self, data) -> List[Dict]:
        """Extract competition data from API JSON response"""
        competitions = []
        
        try:
            # Handle different possible JSON structures
            if isinstance(data, list):
                # Direct list of competitions
                for item in data:
                    comp = self._parse_competition_from_json(item)
                    if comp:
                        competitions.append(comp)
            elif isinstance(data, dict):
                # Look for nested competition data
                possible_keys = ['competitions', 'results', 'data', 'events', 'matches']
                for key in possible_keys:
                    if key in data and isinstance(data[key], list):
                        for item in data[key]:
                            comp = self._parse_competition_from_json(item)
                            if comp:
                                competitions.append(comp)
                        break
                        
        except Exception as e:
            self.logger.warning(f"Error parsing API competition data: {str(e)}")
            
        return competitions
    
    def _parse_competition_from_json(self, item) -> Optional[Dict]:
        """Parse a single competition from JSON data"""
        try:
            # Extract competition details from various possible field names
            event_name = item.get('eventName', item.get('event', item.get('competition', item.get('title', ''))))
            event_id = item.get('eventId', item.get('id', item.get('competitionId', '')))
            g_rank = item.get('gRank', item.get('rank', item.get('category', '')))
            event_date = item.get('eventDate', item.get('date', item.get('startDate', '')))
            location = item.get('location', item.get('venue', item.get('city', '')))
            place = item.get('place', item.get('position', item.get('finalRank', '')))
            ranking_points = item.get('rankingPoints', item.get('points', item.get('score', 0)))
            
            # Convert ranking points to float
            try:
                ranking_points_num = float(ranking_points) if ranking_points else 0.0
            except (ValueError, TypeError):
                ranking_points_num = 0.0
            
            if event_name:  # Only return if we have at least an event name
                return {
                    'event_name': str(event_name),
                    'event_id': str(event_id),
                    'g_rank': str(g_rank),
                    'event_date': str(event_date),
                    'location': str(location),
                    'place': str(place),
                    'ranking_points': str(ranking_points),
                    'ranking_points_num': ranking_points_num
                }
                
        except Exception as e:
            self.logger.debug(f"Error parsing competition JSON item: {str(e)}")
            
        return None
    
    def _extract_competitions_from_html(self, soup) -> List[Dict]:
        """Extract competition data from HTML response"""
        competitions = []
        
        try:
            # Look for tables with competition data
            tables = soup.find_all('table')
            
            for table in tables:
                # Check if this table has competition-related headers
                header_row = table.find('thead')
                if header_row:
                    headers = [th.get_text().strip().lower() for th in header_row.find_all('th')]
                    
                    # Check if this looks like a competition table
                    if any(keyword in ' '.join(headers) for keyword in ['event', 'competition', 'date', 'location', 'place', 'points']):
                        tbody = table.find('tbody')
                        if tbody:
                            rows = tbody.find_all('tr')
                            
                            for row in rows:
                                competition = self._extract_competition_from_row(row)
                                if competition:
                                    competitions.append(competition)
                                    
        except Exception as e:
            self.logger.warning(f"Error extracting competitions from HTML: {str(e)}")
            
        return competitions

    def test_connection(self) -> bool:
        """Test connection to the target website"""
        try:
            response = self._make_request(self.base_url)
            return response is not None and response.status_code == 200
        except Exception as e:
            self.logger.error(f"Connection test failed: {str(e)}")
            return False
