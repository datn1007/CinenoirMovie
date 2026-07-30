import { useOutletContext } from "react-router-dom";
import RoomManagement from "../../components/RoomManagement";
import type { AdminOutletContext } from "../AdminLayout";

export default function AdminRoomsPage() {
  const { cinemaRooms, reloadCinemaRooms } = useOutletContext<AdminOutletContext>();
  return <RoomManagement rooms={cinemaRooms} onReload={reloadCinemaRooms} />;
}
