package com.movie_be.movie.util;

/**
 * FE seat code like A1..H12 -> [seatRow(1..8), seatColumnLetter as its char code].
 */
public final class SeatCodeUtil {

    private SeatCodeUtil() {
    }

    public static int[] parse(String seatCode) {
        if (seatCode == null || seatCode.length() < 2) {
            throw new IllegalArgumentException("Invalid seat code: " + seatCode);
        }
        char rowChar = seatCode.charAt(0);
        if (rowChar < 'A' || rowChar > 'H') {
            throw new IllegalArgumentException("Invalid seat row: " + rowChar);
        }
        int seatRow = (rowChar - 'A') + 1;
        int colNumber;
        try {
            colNumber = Integer.parseInt(seatCode.substring(1));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid seat column: " + seatCode.substring(1));
        }
        if (colNumber < 1 || colNumber > 12) {
            throw new IllegalArgumentException("Invalid seat column number: " + colNumber);
        }
        char seatColumnChar = (char) ('A' + (colNumber - 1));
        return new int[]{seatRow, (int) seatColumnChar};
    }
}
