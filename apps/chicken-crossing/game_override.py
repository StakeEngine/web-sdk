from game_executables import GameExecutables


class GameStateOverride(GameExecutables):
    """
    Override or extend universal state.py functions for the chicken crossing game.
    """

    def reset_book(self):
        """Reset game specific properties."""
        super().reset_book()

    def assign_special_sym_function(self):
        pass

    def check_game_repeat(self):
        if self.repeat is False:
            win_criteria = self.get_current_betmode_distributions().get_win_criteria()
            if win_criteria is not None and self.final_win != win_criteria:
                self.repeat = True
