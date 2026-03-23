import json
from collections import Counter
from helpers import iter_months


# The median is the middle number in a group of numbers.
def get_median_value(game_data, game_attr):
    n = len(game_data)
    game_data.sort()

    if n % 2 == 0:
        median1 = game_data[n // 2]
        median2 = game_data[n // 2 - 1]
        median = (median1 + median2) / 2
    else:
        median = game_data[n // 2]
    print(f"Median value for {game_attr}: {str(median)}")


# The average of all numbers.
def get_average_value(game_data, game_attr):
    n = len(game_data)

    get_sum = sum(game_data)
    average = get_sum / n

    print(f"Average value for {game_attr}: {average:.2f}")


# The mode is the number that occurs most often within a set of numbers.
def get_mode_value(game_data, game_attr):
    n = len(game_data)

    data = Counter(game_data)
    get_mode = dict(data)
    mode = [k for k, v in get_mode.items() if v == max(list(data.values()))]

    if len(mode) == n:
        get_mode = "No mode found"
    else:
        get_mode = f"Mode value for {game_attr}: " + ', '.join(map(str, mode))

    print(get_mode)


def building_metrics(buildings_constructed, buildings_lost):
    total_constructed = sum(buildings_constructed)
    total_lost = sum(buildings_lost)

    loss_rate = total_lost / total_constructed
    survival_rate = 1 - loss_rate

    print(f"Building loss rate: {loss_rate:.2%}")
    print(f"Building survival rate: {survival_rate:.2%}")


def print_values(value_to_be_printed, value_name):
    get_median_value(value_to_be_printed, value_name)
    get_average_value(value_to_be_printed, value_name)
    get_mode_value(value_to_be_printed, value_name)
    print(f"Total {value_name}: {str(sum(value_to_be_printed))}\n")


def test(game_data):

    total_scrap_collected = []

    for i in range(len(game_data)):

        c = game_data[i]['header']

        inside = c[c.find("(") + 1: c.find(")")]

        commander = inside.split("-", 1)[1].strip()

        if game_data[i]['metrics'].get('scrap_collected') is not None:
            if commander == 'F9bomber':
                print(f"{commander} : {game_data[i]['metrics']['scrap_collected']}")
                total_scrap_collected.append(game_data[i]['metrics']['scrap_collected'])

    print(total_scrap_collected)


def collect_player_game_info(json_data):
    (total_scrap_collected, total_buildings_constructed, total_scrap_spent,
     total_buildings_lost, total_scrap_harvested_upgraded) = [], [], [], [], []

    for year, months in iter_months(json_data):

        for month in months.values():
            for day in month.values():
                for match in day.values():
                    stats = match.get("stats")

                    if not stats:
                        continue

                    for team in stats.get("teams_detailed", []):
                        metrics = team.get("metrics", {})

                        scrap_collected = metrics.get("scrap_collected")
                        scrap_upgraded = metrics.get("scrap_harvested_upgraded")
                        scrap_spent = metrics.get("scrap_spent")
                        buildings_constructed = metrics.get("buildings_constructed")
                        buildings_lost = metrics.get("buildings_lost")

                        if scrap_collected is not None and scrap_upgraded and scrap_upgraded > 0:
                            total_scrap_collected.append(scrap_collected)

                        if buildings_constructed is not None:
                            total_buildings_constructed.append(buildings_constructed)

                        if scrap_spent and scrap_spent > 0:
                            total_scrap_spent.append(scrap_spent)

                        if buildings_lost is not None:
                            total_buildings_lost.append(buildings_lost)

                        if scrap_upgraded and scrap_upgraded > 0:
                            total_scrap_harvested_upgraded.append(scrap_upgraded)

    print_values(total_scrap_collected, 'scrap collected')
    print_values(total_scrap_spent, 'scrap spent')
    print_values(total_scrap_harvested_upgraded, 'scrap harvested upgraded')
    print_values(total_buildings_constructed, 'buildings constructed')
    print_values(total_buildings_lost, 'buildings lost')

    building_metrics(total_buildings_constructed, total_buildings_lost)


if __name__ == "__main__":
    with open(f"data\\data.json") as f:
        data = json.load(f)

    collect_player_game_info(data)







