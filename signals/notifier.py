import time
import requests
from datetime import date
from win11toast import notify
import winsound

BACKEND_URL = "http://localhost:3001/api/scan"
POLL_INTERVAL_SECONDS = 15

alerted_today = set()
current_day = date.today()


def reset_if_new_day():
    global current_day, alerted_today
    if date.today() != current_day:
        current_day = date.today()
        alerted_today.clear()
        print("New trading day detected — alert list reset.")


def check_and_notify():
    try:
        response = requests.get(BACKEND_URL, timeout=10)
        data = response.json()
        qualifying = data.get("qualifying", [])

        for stock in qualifying:
            ticker = stock["ticker"]
            if ticker in alerted_today:
                continue

            price = stock.get("price")
            change_pct = stock.get("changePercent")
            rvol = stock.get("rvol")
            float_shares = stock.get("float")

            title = f"🚀 Stock Alert: {ticker}"
            body = f"${price} | +{change_pct:.1f}% | RVOL {rvol}x | Float {float_shares:,}"

            notify(title, body)
            winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)

            alerted_today.add(ticker)
            print(f"Alerted: {ticker}")

    except Exception as e:
        print(f"Error checking scan: {e}")


if __name__ == "__main__":
    print("Notifier started. Watching for qualifying stocks...")
    while True:
        reset_if_new_day()
        check_and_notify()
        time.sleep(POLL_INTERVAL_SECONDS)